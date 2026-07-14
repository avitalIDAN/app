class DebtTablesService {
  async getGroups() {
    if (!permissionService.canViewTable("groups")) return [];
    return await localDbService.getAll("groups");
  }

  async createGroup(group) {
    if (!permissionService.canEditTable("groups")) return null;

    try {
      const newGroup = await localDbService.insert("groups", {
        name: group.name
      }, "groupId");

      await this.logHistory({
        actionType: "create",
        entityType: "group",
        entityId: newGroup.groupId,
        entityLabel: newGroup.name,
        description: "יצירת קבוצה",
        beforeText: "",
        afterText: `נוצרה קבוצה ${newGroup.name}`,
        screenName: "groups",
        actionName: "createGroup",
        details: [
          { fieldName: "groupId", oldValue: "", newValue: newGroup.groupId },
          { fieldName: "name", oldValue: "", newValue: newGroup.name }
        ]
      });

      return newGroup;
    } catch (error) {
      await this.logError(error, "groups", "createGroup", "group", null);
      throw error;
    }
  }

  async updateGroup(groupId, changes) {
    if (!permissionService.canEditTable("groups")) return null;

    try {
      const oldGroup = await localDbService.getById("groups", "groupId", groupId);
      if (!oldGroup) throw new Error("Group not found");

      const updatedGroup = await localDbService.update("groups", "groupId", groupId, {
        name: changes.name
      });

      await this.logHistory({
        actionType: "update",
        entityType: "group",
        entityId: groupId,
        entityLabel: updatedGroup.name,
        description: "עדכון קבוצה",
        beforeText: `שם: ${oldGroup.name || ""}`,
        afterText: `שם: ${updatedGroup.name || ""}`,
        screenName: "groups",
        actionName: "updateGroup",
        details: this.buildChangeDetails(oldGroup, updatedGroup)
      });

      return updatedGroup;
    } catch (error) {
      await this.logError(error, "groups", "updateGroup", "group", groupId);
      throw error;
    }
  }

  async getDebtTypes() {
    if (!permissionService.canViewTable("debtTypes")) return [];
    return await localDbService.getAll("debtTypes");
  }

  async getDebtTypeGroups() {
    if (!permissionService.canViewTable("debtTypeGroups")) return [];
    return await localDbService.getAll("debtTypeGroups");
  }

    async getOriginalDebtTypes() {
    if (!permissionService.canViewTable("originalDebtTypes")) return [];

    const rows = await localDbService.getAll("originalDebtTypes");

    return rows
      .filter(type => type.isActive !== false)
      .sort((a, b) => Number(a.originalCode) - Number(b.originalCode));
  }

  async copyDebtTypesToYear(sourceYear, targetYear, { activeOnly = false } = {}) {
    if (!permissionService.canEditTable("debtTypes")) return null;
    if (!permissionService.canViewTable("originalDebtTypes")) return null;

    try {
      const normalizedSourceYear = Number(sourceYear);
      const normalizedTargetYear = Number(targetYear);

      if (
        !Number.isInteger(normalizedSourceYear) ||
        !Number.isInteger(normalizedTargetYear) ||
        normalizedSourceYear < 2000 ||
        normalizedTargetYear < 2000
      ) {
        throw new Error("יש להזין שנות מקור ויעד תקינות");
      }

      if (normalizedSourceYear === normalizedTargetYear) {
        throw new Error("שנת המקור ושנת היעד חייבות להיות שונות");
      }

      const [allDebtTypes, originalDebtTypes] = await Promise.all([
        localDbService.getAll("debtTypes"),
        localDbService.getAll("originalDebtTypes")
      ]);

      const sourceDebtTypes = allDebtTypes.filter(
        type => Number(type.year) === normalizedSourceYear
      );

      // קודם בודקים האם קיימים בכלל סוגי חיוב בשנת המקור.
      if (!sourceDebtTypes.length) {
        throw new Error(`לא נמצאו סוגי חיוב לשנת ${normalizedSourceYear}`);
      }

      const filteredSourceDebtTypes = activeOnly
        ? sourceDebtTypes.filter(type => type.isActive !== false)
        : sourceDebtTypes;

      const skippedInactiveOriginalCodes = activeOnly
        ? sourceDebtTypes
            .filter(type => type.isActive === false)
            .map(type => type.originalCode)
        : [];

      // if (!filteredSourceDebtTypes.length) {
      //   throw new Error("לא נמצאו סוגי חיוב פעילים להעתקה בשנת המקור");
      // }

      // if (!sourceDebtTypes.length) {
      //   throw new Error(`לא נמצאו סוגי חיוב לשנת ${normalizedSourceYear}`);
      // }

      // בדיקה זו רלוונטית רק כאשר המשתמש ביקש להעתיק פעילים בלבד.
      if (activeOnly && !filteredSourceDebtTypes.length) {
        throw new Error(
          `נמצאו סוגי חיוב לשנת ${normalizedSourceYear}, אך כולם מושבתים`
        );
      }

      // לפני יצירה, מוודאים שכל סוגי המקור עדיין קיימים ופעילים.
      const unavailableOriginalCodes = filteredSourceDebtTypes
        .filter(sourceType => {
          const originalType = originalDebtTypes.find(
            type => String(type.originalCode) === String(sourceType.originalCode)
          );

          return !originalType || originalType.isActive === false;
        })
        .map(type => type.originalCode);

      if (unavailableOriginalCodes.length) {
        throw new Error(
          `לא ניתן לבצע העתקה: סוגי חיוב מקוריים חסרים או לא פעילים: ` +
          unavailableOriginalCodes.join(", ")
        );
      }

      const existingTargetTypes = allDebtTypes.filter(
        type => Number(type.year) === normalizedTargetYear
      );

      const existingOriginalCodes = new Set(
        existingTargetTypes.map(type => String(type.originalCode))
      );

      // אין דריסה של סוג חיוב שכבר קיים בשנת היעד.
      const typesToCopy = filteredSourceDebtTypes.filter(
        type => !existingOriginalCodes.has(String(type.originalCode))
      );

      const skippedOriginalCodes = filteredSourceDebtTypes
        .filter(type => existingOriginalCodes.has(String(type.originalCode)))
        .map(type => type.originalCode);

      const created = [];

      for (const sourceType of typesToCopy) {
        created.push(
          await this.createDebtType({
            originalCode: sourceType.originalCode,
            year: normalizedTargetYear,
            name: "",
            isActive: sourceType.isActive !== false
          })
        );
      }

      // שורת סיכום לפעולה המרוכזת, בנוסף להיסטוריה של כל סוג חיוב שנוצר.
      await this.logHistory({
        actionType: "create",
        entityType: "debtTypeYearCopy",
        entityId: normalizedTargetYear,
        entityLabel: `העתקת ${normalizedSourceYear} ל-${normalizedTargetYear}`,
        description: "העתקת סוגי חיוב לשנה נוספת",
        beforeText: `שנת מקור: ${normalizedSourceYear}`,
        afterText: `שנת יעד: ${normalizedTargetYear}, נוספו: ${created.length}`,
        screenName: "debtTypes",
        actionName: "copyDebtTypesToYear",
        details: [
          { fieldName: "sourceYear", oldValue: "", newValue: normalizedSourceYear },
          { fieldName: "targetYear", oldValue: "", newValue: normalizedTargetYear },
          { fieldName: "createdCount", oldValue: "", newValue: created.length },
          {
            fieldName: "skippedOriginalCodes",
            oldValue: "",
            newValue: skippedOriginalCodes.join(", ")
          }
        ]
      });

      return {
        created,
        skippedOriginalCodes,
        skippedInactiveOriginalCodes
      };
    } catch (error) {
      await this.logError(
        error,
        "debtTypes",
        "copyDebtTypesToYear",
        "debtTypeYearCopy",
        targetYear
      );

      throw error;
    }
  }

  async createDebtType({ originalCode, year, name, isActive = true }) {
    if (!permissionService.canEditTable("debtTypes")) return null;
    if (!permissionService.canViewTable("originalDebtTypes")) return null;

    try {
      const originalTypes = await localDbService.getAll("originalDebtTypes");
      const originalType = originalTypes.find(
        type => String(type.originalCode) === String(originalCode)
      );

      if (!originalType || originalType.isActive === false) {
        throw new Error("סוג החיוב המקורי אינו קיים או אינו פעיל");
      }

      const isYearly = originalType.isYearly !== false;
      const normalizedYear = isYearly ? Number(year) : null;

      if (isYearly && (!Number.isInteger(normalizedYear) || normalizedYear < 2000)) {
        throw new Error("יש להזין שנה תקינה");
      }

      const duplicate = await localDbService.filter(
        "debtTypes",
        type =>
          String(type.originalCode) === String(originalType.originalCode) &&
          (type.year ?? null) === normalizedYear
      );

      if (duplicate.length) {
        throw new Error("כבר קיים סוג חיוב עבור קוד מקורי ושנה אלו");
      }

      // קוד האכיפה נקבע על ידי המערכת בלבד ואינו ניתן לשינוי ידני.
      const enforcementCode = isYearly
        ? Number(`${originalType.originalCode}${normalizedYear}`)
        : Number(originalType.originalCode);

      const debtTypeName = name?.trim() ||
        `${originalType.originalName}${isYearly ? ` ${normalizedYear}` : ""}`;

      const newDebtType = await localDbService.insert(
        "debtTypes",
        {
          originalCode: originalType.originalCode,
          enforcementCode,
          year: normalizedYear,
          name: debtTypeName,
          isActive: isActive !== false
        },
        "debtTypeId"
      );

      await this.logHistory({
        actionType: "create",
        entityType: "debtType",
        entityId: newDebtType.debtTypeId,
        entityLabel: newDebtType.name,
        description: "יצירת סוג חיוב באכיפה",
        beforeText: "",
        afterText: `נוצר סוג חיוב ${newDebtType.name}`,
        screenName: "debtTypes",
        actionName: "createDebtType",
        details: [
          { fieldName: "originalCode", oldValue: "", newValue: newDebtType.originalCode },
          { fieldName: "year", oldValue: "", newValue: newDebtType.year ?? "" },
          { fieldName: "enforcementCode", oldValue: "", newValue: newDebtType.enforcementCode },
          { fieldName: "name", oldValue: "", newValue: newDebtType.name }
        ]
      });

      return newDebtType;
    } catch (error) {
      await this.logError(error, "debtTypes", "createDebtType", "debtType", null);
      throw error;
    }
  }

  async updateDebtType(debtTypeId, changes) {
    if (!permissionService.canEditTable("debtTypes")) return null;

    try {
      const oldDebtType = await localDbService.getById(
        "debtTypes",
        "debtTypeId",
        debtTypeId
      );

      if (!oldDebtType) {
        throw new Error("סוג החיוב לא נמצא");
      }

      // deliberately excludes originalCode, year and enforcementCode.
      const allowedChanges = {};

      if (Object.hasOwn(changes, "name")) {
        const name = String(changes.name || "").trim();

        if (!name) {
          throw new Error("שם סוג החיוב אינו יכול להיות ריק");
        }

        allowedChanges.name = name;
      }

      if (Object.hasOwn(changes, "isActive")) {
        allowedChanges.isActive = changes.isActive === true;
      }

      const updatedDebtType = await localDbService.update(
        "debtTypes",
        "debtTypeId",
        debtTypeId,
        allowedChanges
      );

      await this.logHistory({
        actionType: "update",
        entityType: "debtType",
        entityId: debtTypeId,
        entityLabel: updatedDebtType.name,
        description: "עדכון סוג חיוב באכיפה",
        beforeText: `שם: ${oldDebtType.name || ""}`,
        afterText: `שם: ${updatedDebtType.name || ""}`,
        screenName: "debtTypes",
        actionName: "updateDebtType",
        details: this.buildChangeDetails(oldDebtType, updatedDebtType)
      });

      return updatedDebtType;
    } catch (error) {
      await this.logError(error, "debtTypes", "updateDebtType", "debtType", debtTypeId);
      throw error;
    }
  }

  async copyDebtTypeToYear(debtTypeId, targetYear) {
    const sourceDebtType = await localDbService.getById(
      "debtTypes",
      "debtTypeId",
      debtTypeId
    );

    if (!sourceDebtType) {
      throw new Error("סוג החיוב להעתקה לא נמצא");
    }

    return await this.createDebtType({
      originalCode: sourceDebtType.originalCode,
      year: targetYear,
      name: ""
    });
  }

  async createDebtTypesForYears({ originalCode, fromYear, toYear }) {
    const startYear = Number(fromYear);
    const endYear = Number(toYear);

    if (
      !Number.isInteger(startYear) ||
      !Number.isInteger(endYear) ||
      startYear < 2000 ||
      endYear < startYear
    ) {
      throw new Error("טווח השנים אינו תקין");
    }

    if (endYear - startYear > 20) {
      throw new Error("ניתן ליצור עד 21 שנים בפעולה אחת");
    }

    const created = [];
    const skippedYears = [];

    for (let year = startYear; year <= endYear; year++) {
      const exists = await localDbService.filter(
        "debtTypes",
        type =>
          String(type.originalCode) === String(originalCode) &&
          Number(type.year) === year
      );

      if (exists.length) {
        skippedYears.push(year);
        continue;
      }

      created.push(
        await this.createDebtType({
          originalCode,
          year,
          name: ""
        })
      );
    }

    return { created, skippedYears };
  }

  buildChangeDetails(oldRecord, newRecord) {
    return Object.keys(newRecord)
      .filter(key => oldRecord[key] !== newRecord[key])
      .map(key => ({
        fieldName: key,
        oldValue: oldRecord[key] ?? "",
        newValue: newRecord[key] ?? ""
      }));
  }

  async logHistory(data) {
    if (!window.historyService?.logAction) return;

    await historyService.logAction({
      ...data,
      serviceName: "DebtTablesService"
    });
  }

  async logError(error, screenName, actionName, entityType, entityId) {
    if (!window.errorLogService?.logException) return;

    try {
      await errorLogService.logException({
        error,
        screenName,
        serviceName: "DebtTablesService",
        actionName,
        entityType,
        entityId
      });
    } catch (logError) {
      console.error("Failed to write error log", logError);
    }
  }
}

window.debtTablesService = new DebtTablesService();