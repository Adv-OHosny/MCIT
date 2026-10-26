define("UsrMCITResourceCatalog_ListPage",
    /**SCHEMA_DEPS*/[
        "@creatio-devkit/common",
        "css!UsrMCITResourceCatalogV2CSS"
    ]/**SCHEMA_DEPS*/,
    function/**SCHEMA_ARGS*/(sdk) {

        const RESOURCE = "UsrMCITResourceType";
        const CATEGORY = "UsrMCITResourceCategory";
        const CONTRACT = "UsrMCITContract";
        const LINK = "UsrMCITResourceContract";
        const RATE = "UsrConfigResourceRate";

        const categoryButtons = [
            ["Button_6kx6sj9", "All", "RC_CatAllColor"],
            ["Button_5997q0d", "CPU", "RC_CatCPUColor"],
            ["Button_5hb5dth", "RAM", "RC_CatRAMColor"],
            ["Button_79y53ba", "Storage", "RC_CatStorageColor"],
            ["Button_cwug7wg", "OS", "RC_CatOSColor"],
            ["Button_6mn3e02", "Environment", "RC_CatEnvironmentColor"],
            ["Button_usvoj1p", "Network", "RC_CatNetworkColor"],
            ["Button_v6h9rne", "Other", "RC_CatOtherColor"]
        ];

        const statusButtons = [
            ["Button_k35gcub", "All", "RC_StatusAllColor"],
            ["Button_s5dghlb", "Active", "RC_StatusActiveColor"],
            ["Button_nwxmun1", "Inactive", "RC_StatusInactiveColor"]
        ];

        function add(name, type, parent, index, values = {}) {
            return {
                operation: "insert",
                name: name,
                values: Object.assign({
                    type: type
                }, values),
                parentName: parent,
                propertyName: "items",
                index: index
            };
        }

        function remove(name) {
            return {
                operation: "remove",
                name: name
            };
        }

        function getId(value) {
            if (!value) return null;
            if (typeof value === "string") return value;
            return value.value || value.Id || value.id || null;
        }

        function getName(value) {
            if (!value) return "";
            if (typeof value === "string") return value;
            return value.displayValue || value.Name || "";
        }

        function toDate(value) {
            if (!value) return null;
            if (value instanceof Date) return value;
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date;
        }

        function dateValue(value) {
            if (!value) return null;
            if (value instanceof Date) {
                const year = value.getFullYear();
                const month = String(value.getMonth() + 1)
                    .padStart(2, "0");
                const day = String(value.getDate())
                    .padStart(2, "0");
                return year + "-" + month + "-" + day;
            }
            return String(value).substring(0, 10);
        }

        function numeric(value) {
            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {
                return null;
            }
            return Number(value);
        }

        async function parametersById(id) {
            return [{
                type: sdk.ModelParameterType.PrimaryColumnValue,
                value: id
            }];
        }

        async function parametersByColumn(column, value) {
            const group = new sdk.FilterGroup();

            await group.addSchemaColumnFilterWithParameter(
                sdk.ComparisonType.Equal,
                column,
                value
            );

            const filter = Object.assign({}, group);
            filter.items = group.items;

            return [{
                type: sdk.ModelParameterType.Filter,
                value: filter
            }];
        }

        async function readRecords(model, attributes, parameters) {
            const result = [];
            const pageSize = 250;

            for (let page = 0; page < 40; page++) {
                const records = await model.load({
                    attributes: attributes,
                    ...(parameters ? { parameters: parameters } : {}),
                    options: {
                        pagingConfig: {
                            rowsOffset: page * pageSize,
                            rowCount: pageSize
                        },
                        sortingConfig: {
                            columns: [{
                                columnName: "Id",
                                direction: "asc"
                            }]
                        }
                    }
                });

                result.push(...records);

                if (records.length < pageSize) {
                    return result;
                }
            }

            throw new Error(
                "Resource query exceeded the configured paging limit."
            );
        }

        async function updateStatistics(context) {
            try {
                const model = await sdk.Model.create(RESOURCE);
                const resources = await readRecords(
                    model,
                    ["Id", "UsrActive"]
                );

                context.RC_ActiveCount = String(
                    resources.filter(r => r.UsrActive === true).length
                );
            } catch (e) {
                context.RC_ActiveCount = "—";
                console.error("Active count:", e);
            }

            try {
                const model = await sdk.Model.create(RATE);
                const rates = await readRecords(
                    model,
                    ["Id", "UsrResourceType", "UsrPointsPerUnit"]
                );

                const resourceIds = new Set();

                rates.forEach(rate => {
                    const id = getId(rate.UsrResourceType);
                    if (
                        id &&
                        Number(rate.UsrPointsPerUnit) > 0
                    ) {
                        resourceIds.add(id);
                    }
                });

                context.RC_PointCount = String(resourceIds.size);
            } catch (e) {
                context.RC_PointCount = "—";
                console.error("Point count:", e);
            }
        }

        async function refreshTable(context) {
            await context.executeRequest({
                type: "crt.LoadDataRequest",
                $context: context,
                dataSourceName: "PDS",
                config: {
                    loadType: "reload"
                }
            });
        }

        async function applyFilters(context) {
            const category = await context.RC_CategoryFilter || "All";
            const status = await context.RC_StatusFilter || "All";

            const filter = new sdk.FilterGroup();
            filter.logicalOperation = sdk.LogicalOperatorType.And;

            if (category !== "All") {
                await filter.addSchemaColumnFilterWithParameter(
                    sdk.ComparisonType.Equal,
                    "UsrCategory.Name",
                    category
                );
            }

            if (status !== "All") {
                await filter.addSchemaColumnFilterWithParameter(
                    sdk.ComparisonType.Equal,
                    "UsrActive",
                    status === "Active"
                );
            }

            if (category === "All" && status === "All") {
                filter.isEnabled = false;
            }

            const plain = Object.assign({}, filter);
            plain.items = filter.items;
            context.RC_ButtonFilter = plain;

            categoryButtons.forEach(item => {
                context[item[2]] =
                    category === item[1] ? "primary" : "default";
            });

            statusButtons.forEach(item => {
                context[item[2]] =
                    status === item[1] ? "primary" : "default";
            });
        }

        async function clearForm(context) {
            context.RC_RecordId = null;
            context.RC_Name = "";
            context.RC_ArabicName = "";
            context.RC_Code = "";
            context.RC_CategoryId = null;
            context.RC_CategoryText = "";
            context.RC_Unit = "";
            context.RC_Min = null;
            context.RC_Max = null;
            context.RC_Increment = null;
            context.RC_Start = new Date();
            context.RC_End = null;
            context.RC_AllContracts = true;
            context.RC_Active = true;
            context.RC_Contracts = [];
            context.RC_ContractsText = "All Contracts";
            context.RC_SelectContractsVisible = false;
            context.RC_Error = "";
            context.RC_ErrorVisible = false;
            context.RC_Saving = false;
        }

        function setContractsDisplay(context, selected, all) {
            context.RC_ContractsText = all
                ? "All Contracts"
                : selected.length
                    ? selected.map(getName).join(", ")
                    : "No contracts selected";

            context.RC_SelectContractsVisible = !all;
        }

        async function loadContractLinks(resourceId) {
            const model = await sdk.Model.create(LINK);
            const records = await readRecords(
                model,
                ["Id", "UsrContract"],
                await parametersByColumn(
                    "UsrResourceType",
                    resourceId
                )
            );

            return records.map(record => ({
                linkId: record.Id,
                value: getId(record.UsrContract),
                displayValue: getName(record.UsrContract)
            })).filter(x => x.value);
        }

        async function synchronizeContracts(resourceId, selected, all) {
            const model = await sdk.Model.create(LINK);
            const oldLinks = await loadContractLinks(resourceId);
            const wantedIds = all
                ? []
                : [...new Set(selected.map(getId).filter(Boolean))];

            const wanted = new Set(wantedIds);
            const existing = new Set(oldLinks.map(x => x.value));

            for (const link of oldLinks) {
                if (!wanted.has(link.value)) {
                    const result = await model.delete(
                        await parametersById(link.linkId)
                    );

                    if (!result?.success) {
                        throw new Error(
                            "Failed to remove a resource-contract link."
                        );
                    }
                }
            }

            for (const contractId of wantedIds) {
                if (!existing.has(contractId)) {
                    const result = await model.insert({
                        UsrResourceType: resourceId,
                        UsrContract: contractId
                    });

                    if (!result?.success) {
                        throw new Error(
                            "Failed to add a resource-contract link."
                        );
                    }
                }
            }
        }

        function showError(context, text) {
            context.RC_Error = text;
            context.RC_ErrorVisible = true;
        }

        function normaliseSelection(result) {
            if (!result) return [];

            if (Array.isArray(result)) {
                return result;
            }

            if (Array.isArray(result.value)) {
                return result.value;
            }

            return Object.values(result).filter(
                item => item && (
                    item.value || item.Id || item.id
                )
            );
        }

        function filterButton(item, index, parent, requestName) {
            return add(
                item[0],
                "crt.Button",
                parent,
                index,
                {
                    caption: item[1],
                    color: "$" + item[2],
                    size: "medium",
                    iconPosition: "only-text",
                    classes: ["mcit-rc-filter"],
                    clicked: {
                        request: requestName,
                        params: {
                            selectedValue: item[1]
                        }
                    }
                }
            );
        }

        function field(
            name, type, title, attribute,
            column, row, index, extras
        ) {
            return add(
                name,
                type,
                "RC_EditorGrid",
                index,
                Object.assign({
                    label: title,
                    labelPosition: "above",
                    control: "$" + attribute,
                    classes: ["mcit-rc-field"],
                    layoutConfig: {
                        column: column,
                        row: row,
                        colSpan: 1,
                        rowSpan: 1
                    }
                }, extras || {})
            );
        }

        const unusedContainers = [
            "MainContainer",
            "MainFilterContainer",
            "LeftFilterContainer",
            "LeftFilterContainerInner",
            "FolderTreeActions",
            "FiltersMenu",
            "LookupQuickFilterByTag",
            "SearchFilter",
            "RightFilterContainer",
            "DataTable_Summaries",
            "RefreshButton",
            "MainButtonToggleGroup",
            "ContentContainer",
            "FolderTree",
            "Filters",
            "SectionContentWrapper",
            "MainTabPanel",
            "ListTabContainer",
            "ListContainer",
            "DashboardsTabContainer",
            "DashboardsContainer",
            "Dashboards"
        ];

        return {
            viewConfigDiff: /**SCHEMA_VIEW_CONFIG_DIFF*/[
                {
                    operation: "merge",
                    name: "MainHeader",
                    values: {
                        visible: false
                    }
                },
                {
                    operation: "merge",
                    name: "Main",
                    values: {
                        classes: ["mcit-rc-root"]
                    }
                },
                {
                    operation: "merge",
                    name: "MenuItem_ImportFromExcel",
                    values: {
                        clicked: {
                            request: "crt.ImportDataRequest",
                            params: {
                                entitySchemaName: RESOURCE
                            }
                        }
                    }
                },

                ...unusedContainers.map(remove),

                add("RC_PageHeader", "crt.FlexContainer", "Main", 0, {
                    direction: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    wrap: "wrap",
                    gap: "medium",
                    items: [],
                    classes: ["mcit-rc-page-header"]
                }),
                add("RC_HeaderText", "crt.FlexContainer",
                    "RC_PageHeader", 0, {
                        direction: "column",
                        gap: "small",
                        items: [],
                        fitContent: true
                    }
                ),
                add("RC_HeaderTitle", "crt.Label",
                    "RC_HeaderText", 0, {
                        caption: "Resource Catalog",
                        labelType: "headline",
                        labelColor: "primary",
                        classes: ["mcit-rc-title"]
                    }
                ),
                add("RC_HeaderDescription", "crt.Label",
                    "RC_HeaderText", 1, {
                        caption: "Configurable VM resource specifications for request forms and point rule calculation",
                        labelType: "body",
                        labelColor: "secondary",
                        classes: ["mcit-rc-subtitle"]
                    }
                ),
                add("RC_HeaderActions", "crt.FlexContainer",
                    "RC_PageHeader", 1, {
                        direction: "row",
                        gap: "small",
                        items: []
                    }
                ),
                add("RC_ImportButton", "crt.Button",
                    "RC_HeaderActions", 0, {
                        caption: "Import",
                        color: "default",
                        size: "medium",
                        clicked: {
                            request: "crt.ImportDataRequest",
                            params: {
                                entitySchemaName: RESOURCE
                            }
                        }
                    }
                ),
                add("RC_AddResourceButton", "crt.Button",
                    "RC_HeaderActions", 1, {
                        caption: "+ Add Resource",
                        color: "primary",
                        size: "large",
                        classes: ["mcit-rc-add-button"],
                        clicked: {
                            request: "usr.RC_OpenAdd"
                        }
                    }
                ),

                add("RC_Statistics", "crt.FlexContainer", "Main", 1, {
                    direction: "row",
                    gap: "small",
                    wrap: "wrap",
                    items: [],
                    classes: ["mcit-rc-stats"]
                }),
                add("RC_ActiveCountLabel", "crt.Label",
                    "RC_Statistics", 0, {
                        caption: "$RC_ActiveCount",
                        labelType: "body",
                        classes: ["mcit-rc-stat-number"]
                    }
                ),
                add("RC_ActiveCaption", "crt.Label",
                    "RC_Statistics", 1, {
                        caption: "active resource types",
                        labelType: "body"
                    }
                ),
                add("RC_StatSeparator", "crt.Label",
                    "RC_Statistics", 2, {
                        caption: "·",
                        labelType: "body",
                        classes: ["mcit-rc-stat-separator"]
                    }
                ),
                add("RC_PointCountLabel", "crt.Label",
                    "RC_Statistics", 3, {
                        caption: "$RC_PointCount",
                        labelType: "body",
                        classes: ["mcit-rc-stat-number"]
                    }
                ),
                add("RC_PointCaption", "crt.Label",
                    "RC_Statistics", 4, {
                        caption: "used in point rules",
                        labelType: "body"
                    }
                ),

                add("RC_FilterBar", "crt.FlexContainer", "Main", 2, {
                    direction: "row",
                    wrap: "wrap",
                    gap: "small",
                    alignItems: "center",
                    items: [],
                    classes: ["mcit-rc-filterbar"]
                }),
                add("SearchFilter_oyeci5d", "crt.SearchFilter",
                    "RC_FilterBar", 0, {
                        placeholder: "Search resources...",
                        classes: ["mcit-rc-search"],
                        _filterOptions: {
                            expose: [{
                                attribute: "SearchFilter_oyeci5d_Items",
                                converters: [{
                                    converter:
                                        "crt.SearchFilterAttributeConverter",
                                    args: ["Items"]
                                }]
                            }],
                            from: [
                                "SearchFilter_oyeci5d_SearchValue",
                                "SearchFilter_oyeci5d_FilteredColumnsGroups"
                            ]
                        }
                    }
                ),
                add("RC_CategoryFilterBar", "crt.FlexContainer",
                    "RC_FilterBar", 1, {
                        direction: "row",
                        wrap: "wrap",
                        gap: "small",
                        items: [],
                        classes: ["mcit-rc-filter-group"]
                    }
                ),
                ...categoryButtons.map((item, index) =>
                    filterButton(
                        item,
                        index,
                        "RC_CategoryFilterBar",
                        "usr.RC_FilterCategory"
                    )
                ),
                add("RC_StatusFilterBar", "crt.FlexContainer",
                    "RC_FilterBar", 2, {
                        direction: "row",
                        wrap: "wrap",
                        gap: "small",
                        items: [],
                        classes: ["mcit-rc-filter-group"]
                    }
                ),
                ...statusButtons.map((item, index) =>
                    filterButton(
                        item,
                        index,
                        "RC_StatusFilterBar",
                        "usr.RC_FilterStatus"
                    )
                ),

                add("RC_Editor", "crt.FlexContainer", "Main", 3, {
                    direction: "column",
                    wrap: "nowrap",
                    gap: "medium",
                    items: [],
                    fitContent: true,
                    visible: "$RC_EditorVisible",
                    classes: ["mcit-rc-editor"]
                }),
                add("RC_EditorHeader", "crt.FlexContainer",
                    "RC_Editor", 0, {
                        direction: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        items: []
                    }
                ),
                add("RC_EditorTitle", "crt.Label",
                    "RC_EditorHeader", 0, {
                        caption: "$RC_EditorCaption",
                        labelType: "headline",
                        classes: ["mcit-rc-editor-title"]
                    }
                ),
                add("RC_CloseEditor", "crt.Button",
                    "RC_EditorHeader", 1, {
                        caption: "Close",
                        color: "default",
                        size: "medium",
                        clicked: {
                            request: "usr.RC_Close"
                        }
                    }
                ),
                add("RC_Information", "crt.Label", "RC_Editor", 1, {
                    caption: "This resource catalog drives the request item form. Changes affect point rule configuration.",
                    labelType: "body",
                    labelColor: "info",
                    classes: ["mcit-rc-info"]
                }),
                add("RC_ErrorLabel", "crt.Label", "RC_Editor", 2, {
                    caption: "$RC_Error",
                    visible: "$RC_ErrorVisible",
                    labelType: "body",
                    labelColor: "error",
                    classes: ["mcit-rc-error"]
                }),
                add("RC_EditorGrid", "crt.GridContainer",
                    "RC_Editor", 3, {
                        columns: [
                            "minmax(32px, 1fr)",
                            "minmax(32px, 1fr)"
                        ],
                        rows: "repeat(6, minmax(max-content, 48px))",
                        gap: {
                            columnGap: "large",
                            rowGap: "medium"
                        },
                        items: [],
                        fitContent: true,
                        classes: ["mcit-rc-form-grid"]
                    }
                ),

                field(
                    "Input_i2v2wni", "crt.Input",
                    "English Name *", "RC_Name",
                    1, 1, 0
                ),
                field(
                    "Input_rg8a9gd", "crt.Input",
                    "Arabic Name", "RC_ArabicName",
                    2, 1, 1
                ),
                field(
                    "Input_dw0pzk1", "crt.Input",
                    "Resource Code *", "RC_Code",
                    1, 2, 2, {
                        placeholder: "e.g. CPU-VCPU"
                    }
                ),

                add("RC_CategoryCell", "crt.FlexContainer",
                    "RC_EditorGrid", 3, {
                        direction: "column",
                        gap: "small",
                        items: [],
                        layoutConfig: {
                            column: 2,
                            row: 2,
                            colSpan: 1,
                            rowSpan: 1
                        }
                    }
                ),
                add("ComboBox_c1pi61t", "crt.Input",
                    "RC_CategoryCell", 0, {
                        label: "Category",
                        labelPosition: "above",
                        control: "$RC_CategoryText",
                        readonly: true,
                        classes: ["mcit-rc-field"]
                    }
                ),
                add("RC_CategoryPicker", "crt.Button",
                    "RC_CategoryCell", 1, {
                        caption: "Select Category",
                        color: "default",
                        size: "medium",
                        clicked: {
                            request: "usr.RC_SelectCategory"
                        }
                    }
                ),

                field(
                    "Input_4khkr3d", "crt.Input",
                    "Unit", "RC_Unit",
                    1, 3, 4, {
                        placeholder: "e.g. vCPU, GB, selection"
                    }
                ),
                field(
                    "NumberInput_5w335nl", "crt.NumberInput",
                    "Min Value", "RC_Min",
                    1, 4, 5
                ),
                field(
                    "NumberInput_prx28hh", "crt.NumberInput",
                    "Max Value", "RC_Max",
                    2, 4, 6
                ),
                field(
                    "NumberInput_4izvqds", "crt.NumberInput",
                    "Increment", "RC_Increment",
                    1, 5, 7
                ),
                field(
                    "DateTimePicker_cdpklpw", "crt.DateTimePicker",
                    "Creation Date", "RC_Start",
                    1, 6, 8, {
                        pickerType: "date"
                    }
                ),
                field(
                    "DateTimePicker_18fbam1", "crt.DateTimePicker",
                    "End Date", "RC_End",
                    2, 6, 9, {
                        pickerType: "date"
                    }
                ),

                add("RC_ContractsTitle", "crt.Label",
                    "RC_Editor", 4, {
                        caption: "Applicable Contracts",
                        labelType: "body",
                        classes: ["mcit-rc-field-title"]
                    }
                ),
                add("RC_ContractsBar", "crt.FlexContainer",
                    "RC_Editor", 5, {
                        direction: "row",
                        gap: "small",
                        wrap: "wrap",
                        items: []
                    }
                ),
                add("Checkbox_mlv9uxw", "crt.Checkbox",
                    "RC_ContractsBar", 0, {
                        label: "All Contracts",
                        control: "$RC_AllContracts"
                    }
                ),
                add("RC_SelectContracts", "crt.Button",
                    "RC_ContractsBar", 1, {
                        caption: "Select Contracts",
                        size: "medium",
                        color: "default",
                        visible: "$RC_SelectContractsVisible",
                        clicked: {
                            request: "usr.RC_SelectContracts"
                        }
                    }
                ),
                add("RC_ClearContracts", "crt.Button",
                    "RC_ContractsBar", 2, {
                        caption: "Clear",
                        size: "medium",
                        color: "default",
                        visible: "$RC_SelectContractsVisible",
                        clicked: {
                            request: "usr.RC_ClearContracts"
                        }
                    }
                ),
                add("RC_ContractsDisplay", "crt.Label",
                    "RC_Editor", 6, {
                        caption: "$RC_ContractsText",
                        labelType: "body",
                        labelColor: "secondary",
                        classes: ["mcit-rc-contract-text"]
                    }
                ),
                add("RC_StatusTitle", "crt.Label",
                    "RC_Editor", 7, {
                        caption: "Status",
                        labelType: "body",
                        classes: ["mcit-rc-field-title"]
                    }
                ),
                add("Checkbox_b6glhe1", "crt.Checkbox",
                    "RC_Editor", 8, {
                        label: "Active",
                        control: "$RC_Active"
                    }
                ),
                add("RC_FormActions", "crt.FlexContainer",
                    "RC_Editor", 9, {
                        direction: "row",
                        justifyContent: "end",
                        gap: "small",
                        items: [],
                        classes: ["mcit-rc-form-actions"]
                    }
                ),
                add("RC_Cancel", "crt.Button",
                    "RC_FormActions", 0, {
                        caption: "Cancel",
                        color: "default",
                        size: "large",
                        clicked: {
                            request: "usr.RC_Close"
                        }
                    }
                ),
                add("RC_Save", "crt.Button",
                    "RC_FormActions", 1, {
                        caption: "Save",
                        color: "primary",
                        size: "large",
                        disabled: "$RC_Saving",
                        clicked: {
                            request: "usr.RC_Save"
                        }
                    }
                ),

                {
                    operation: "merge",
                    name: "DataTable",
                    values: {
                        visible: "$RC_TableVisible",
                        classes: ["mcit-rc-table"],
                        columns: [
                            {
                                id: "f252f581-0ccf-44ac-b7c9-c00df2ad9919",
                                code: "PDS_Name",
                                caption: "Resource Name",
                                dataValueType: 1
                            },
                            {
                                id: "3e842ba6-8ecd-3da3-0c34-40b1221385d6",
                                code: "PDS_UsrCode",
                                caption: "Resource Code",
                                dataValueType: 27
                            },
                            {
                                id: "21408cf3-01cb-34ab-d2f5-09cfa69f5596",
                                code: "PDS_UsrCategory",
                                caption: "Category",
                                dataValueType: 10
                            },
                            {
                                id: "7f64dd68-bf1e-072f-2509-081899e6b12b",
                                code: "PDS_UsrUnit",
                                caption: "Unit",
                                dataValueType: 28
                            },
                            {
                                id: "rc-all-contracts",
                                code: "PDS_UsrAllContracts",
                                caption: "All Contracts",
                                dataValueType: 12
                            },
                            {
                                id: "caa7bf86-c7f1-2f63-be7e-f4f1b51c4d19",
                                code: "PDS_UsrActive",
                                caption: "Active",
                                dataValueType: 12
                            },
                            {
                                id: "631fbaa0-5092-fe61-2760-bc9db843f04a",
                                code: "PDS_UsrStartDate",
                                caption: "Creation Date",
                                dataValueType: 8
                            }
                        ],
                        rowToolbarItems: [
                            {
                                type: "crt.MenuItem",
                                caption: "Open / Edit",
                                icon: "edit-row-action",
                                clicked: {
                                    request: "usr.RC_OpenEdit",
                                    params: {
                                        itemsAttributeName: "Items",
                                        recordId: "$Items.PDS_Id"
                                    }
                                }
                            },
                            {
                                type: "crt.MenuItem",
                                caption: "Activate / Deactivate",
                                icon: "edit-row-action",
                                clicked: {
                                    request: "usr.RC_ToggleStatus",
                                    params: {
                                        itemsAttributeName: "Items",
                                        recordId: "$Items.PDS_Id"
                                    }
                                }
                            }
                        ]
                    }
                },
                {
                    operation: "move",
                    name: "DataTable",
                    parentName: "Main",
                    propertyName: "items",
                    index: 4
                },
                add("RC_FooterNote", "crt.Label", "Main", 5, {
                    caption: "Request item forms render selectable values from this catalog. Changes take effect for new requests only.",
                    labelType: "body",
                    labelColor: "info",
                    classes: ["mcit-rc-footer"]
                })

            ]/**SCHEMA_VIEW_CONFIG_DIFF*/,

            viewModelConfigDiff: /**SCHEMA_VIEW_MODEL_CONFIG_DIFF*/[
                {
                    operation: "merge",
                    path: ["attributes"],
                    values: {
                        RC_ActiveCount: { value: "—" },
                        RC_PointCount: { value: "—" },

                        RC_CategoryFilter: { value: "All" },
                        RC_StatusFilter: { value: "All" },
                        RC_ButtonFilter: {},

                        RC_CatAllColor: { value: "primary" },
                        RC_CatCPUColor: { value: "default" },
                        RC_CatRAMColor: { value: "default" },
                        RC_CatStorageColor: { value: "default" },
                        RC_CatOSColor: { value: "default" },
                        RC_CatEnvironmentColor: { value: "default" },
                        RC_CatNetworkColor: { value: "default" },
                        RC_CatOtherColor: { value: "default" },

                        RC_StatusAllColor: { value: "primary" },
                        RC_StatusActiveColor: { value: "default" },
                        RC_StatusInactiveColor: { value: "default" },

                        RC_EditorVisible: { value: false },
                        RC_TableVisible: { value: true },
                        RC_EditorCaption: { value: "Add Resource" },
                        RC_Error: { value: "" },
                        RC_ErrorVisible: { value: false },
                        RC_Saving: { value: false },

                        RC_RecordId: {},
                        RC_Name: {},
                        RC_ArabicName: {},
                        RC_Code: {},
                        RC_CategoryId: {},
                        RC_CategoryText: {},
                        RC_Unit: {},
                        RC_Min: {},
                        RC_Max: {},
                        RC_Increment: {},
                        RC_Start: {},
                        RC_End: {},
                        RC_AllContracts: { value: true },
                        RC_Active: { value: true },
                        RC_Contracts: {},
                        RC_ContractsText: { value: "All Contracts" },
                        RC_SelectContractsVisible: { value: false }
                    }
                },
                {
                    operation: "merge",
                    path: [
                        "attributes",
                        "Items",
                        "viewModelConfig",
                        "attributes"
                    ],
                    values: {
                        PDS_Name: {
                            modelConfig: { path: "PDS.Name" }
                        },
                        PDS_UsrCode: {
                            modelConfig: { path: "PDS.UsrCode" }
                        },
                        PDS_UsrCategory: {
                            modelConfig: { path: "PDS.UsrCategory" }
                        },
                        PDS_UsrUnit: {
                            modelConfig: { path: "PDS.UsrUnit" }
                        },
                        PDS_UsrAllContracts: {
                            modelConfig: {
                                path: "PDS.UsrAllContracts"
                            }
                        },
                        PDS_UsrActive: {
                            modelConfig: { path: "PDS.UsrActive" }
                        },
                        PDS_UsrStartDate: {
                            modelConfig: { path: "PDS.UsrStartDate" }
                        }
                    }
                },
                {
                    operation: "merge",
                    path: [
                        "attributes",
                        "Items",
                        "modelConfig"
                    ],
                    values: {
                        filterAttributes: [
                            {
                                name: "Items_PredefinedFilter",
                                loadOnChange: true
                            },
                            {
                                name: "SearchFilter_oyeci5d_Items",
                                loadOnChange: true
                            },
                            {
                                name: "RC_ButtonFilter",
                                loadOnChange: true
                            }
                        ]
                    }
                },
                {
                    operation: "merge",
                    path: [
                        "attributes",
                        "Items",
                        "modelConfig",
                        "sortingConfig"
                    ],
                    values: {
                        default: [{
                            columnName: "Name",
                            direction: "asc"
                        }]
                    }
                }
            ]/**SCHEMA_VIEW_MODEL_CONFIG_DIFF*/,

            modelConfigDiff: /**SCHEMA_MODEL_CONFIG_DIFF*/[
                {
                    operation: "merge",
                    path: ["dataSources", "PDS", "config"],
                    values: {
                        entitySchemaName: RESOURCE,
                        attributes: {
                            Name: { path: "Name" },
                            UsrCode: { path: "UsrCode" },
                            UsrCategory: { path: "UsrCategory" },
                            UsrUnit: { path: "UsrUnit" },
                            UsrAllContracts: {
                                path: "UsrAllContracts"
                            },
                            UsrActive: { path: "UsrActive" },
                            UsrStartDate: { path: "UsrStartDate" }
                        }
                    }
                }
            ]/**SCHEMA_MODEL_CONFIG_DIFF*/,

            handlers: /**SCHEMA_HANDLERS*/[
                {
                    request: "crt.HandleViewModelInitRequest",
                    handler: async (request, next) => {
                        const result = await next?.handle(request);

                        // Counts cannot hold up page initialization.
                        Promise.resolve()
                            .then(() => updateStatistics(request.$context))
                            .catch(e => console.error(e));

                        return result;
                    }
                },
                {
                    request: "usr.RC_FilterCategory",
                    handler: async request => {
                        const chosen = request.selectedValue;

                        if (!categoryButtons.some(x => x[1] === chosen)) {
                            return;
                        }

                        request.$context.RC_CategoryFilter = chosen;
                        await applyFilters(request.$context);
                    }
                },
                {
                    request: "usr.RC_FilterStatus",
                    handler: async request => {
                        const chosen = request.selectedValue;

                        if (!statusButtons.some(x => x[1] === chosen)) {
                            return;
                        }

                        request.$context.RC_StatusFilter = chosen;
                        await applyFilters(request.$context);
                    }
                },
                {
                    request: "usr.RC_OpenAdd",
                    handler: async request => {
                        const context = request.$context;

                        await clearForm(context);

                        context.RC_EditorCaption = "Add Resource";
                        context.RC_EditorVisible = true;
                        context.RC_TableVisible = false;
                    }
                },
                {
                    request: "usr.RC_OpenEdit",
                    handler: async request => {
                        const context = request.$context;
                        const id = getId(request.recordId);

                        if (!id) {
                            console.error(
                                "Open/Edit did not receive a record Id."
                            );
                            return;
                        }

                        try {
                            const model = await sdk.Model.create(RESOURCE);

                            const rows = await model.load({
                                attributes: [
                                    "Id", "Name", "UsrArabicName",
                                    "UsrCode", "UsrCategory", "UsrUnit",
                                    "UsrMinValue", "UsrMaxValue",
                                    "UsrIncrement", "UsrStartDate",
                                    "UsrEndDate", "UsrAllContracts",
                                    "UsrActive"
                                ],
                                parameters: await parametersById(id)
                            });

                            if (!rows.length) {
                                throw new Error("Resource not found.");
                            }

                            const row = rows[0];

                            await clearForm(context);

                            context.RC_RecordId = row.Id;
                            context.RC_Name = row.Name || "";
                            context.RC_ArabicName =
                                row.UsrArabicName || "";
                            context.RC_Code = row.UsrCode || "";
                            context.RC_CategoryId =
                                getId(row.UsrCategory);
                            context.RC_CategoryText =
                                getName(row.UsrCategory);
                            context.RC_Unit = row.UsrUnit || "";
                            context.RC_Min = row.UsrMinValue;
                            context.RC_Max = row.UsrMaxValue;
                            context.RC_Increment = row.UsrIncrement;
                            context.RC_Start = toDate(row.UsrStartDate);
                            context.RC_End = toDate(row.UsrEndDate);
                            context.RC_AllContracts =
                                row.UsrAllContracts === true;
                            context.RC_Active = row.UsrActive === true;

                            const selected = await loadContractLinks(id);

                            context.RC_Contracts = selected;
                            setContractsDisplay(
                                context,
                                selected,
                                row.UsrAllContracts === true
                            );

                            context.RC_EditorCaption =
                                "Edit: " + row.Name;
                            context.RC_EditorVisible = true;
                            context.RC_TableVisible = false;

                        } catch (e) {
                            console.error("Open Resource:", e);
                            showError(context, e.message);
                        }
                    }
                },
                {
                    request: "usr.RC_Close",
                    handler: async request => {
                        const context = request.$context;

                        await clearForm(context);

                        context.RC_EditorVisible = false;
                        context.RC_TableVisible = true;
                    }
                },
                {
                    request: "usr.RC_SelectCategory",
                    handler: async request => {
                        const context = request.$context;

                        await context.executeRequest({
                            type: "crt.OpenLookupPageRequest",
                            $context: context,
                            entitySchemaName: CATEGORY,
                            caption: "Select Resource Category",
                            features: {
                                select: {
                                    multiple: false,
                                    resultType: "lookupValues"
                                },
                                create: {
                                    enabled: false
                                }
                            },
                            afterClosed: result => {
                                const selected =
                                    normaliseSelection(result);

                                if (!selected.length) return;

                                context.RC_CategoryId =
                                    getId(selected[0]);
                                context.RC_CategoryText =
                                    getName(selected[0]);
                            }
                        });
                    }
                },
                {
                    request: "usr.RC_SelectContracts",
                    handler: async request => {
                        const context = request.$context;

                        await context.executeRequest({
                            type: "crt.OpenLookupPageRequest",
                            $context: context,
                            entitySchemaName: CONTRACT,
                            caption: "Select Applicable Contracts",
                            features: {
                                select: {
                                    multiple: true,
                                    selectAll: false,
                                    resultType: "lookupValues"
                                },
                                create: {
                                    enabled: false
                                }
                            },
                            afterClosed: async result => {
                                const selected =
                                    normaliseSelection(result);

                                if (!selected.length) return;

                                const old =
                                    await context.RC_Contracts || [];

                                const distinct = new Map();

                                for (const item of old.concat(selected)) {
                                    const id = getId(item);
                                    if (id) {
                                        distinct.set(id, {
                                            value: id,
                                            displayValue: getName(item)
                                        });
                                    }
                                }

                                const updated = [...distinct.values()];
                                context.RC_Contracts = updated;
                                context.RC_AllContracts = false;

                                setContractsDisplay(
                                    context,
                                    updated,
                                    false
                                );
                            }
                        });
                    }
                },
                {
                    request: "usr.RC_ClearContracts",
                    handler: async request => {
                        const context = request.$context;

                        context.RC_Contracts = [];
                        setContractsDisplay(context, [], false);
                    }
                },
                {
                    request: "crt.HandleViewModelAttributeChangeRequest",
                    handler: async (request, next) => {
                        if (request.attributeName === "RC_AllContracts") {
                            setContractsDisplay(
                                request.$context,
                                await request.$context.RC_Contracts || [],
                                request.value === true
                            );
                        }

                        return next?.handle(request);
                    }
                },
                {
                    request: "usr.RC_Save",
                    handler: async request => {
                        const context = request.$context;

                        if (await context.RC_Saving) return;

                        const read = async key => await context[key];

                        const name = String(
                            await read("RC_Name") || ""
                        ).trim();

                        const code = String(
                            await read("RC_Code") || ""
                        ).trim();

                        const categoryId =
                            getId(await read("RC_CategoryId"));

                        const min = numeric(await read("RC_Min"));
                        const max = numeric(await read("RC_Max"));
                        const increment =
                            numeric(await read("RC_Increment"));

                        const start = dateValue(await read("RC_Start"));
                        const end = dateValue(await read("RC_End"));

                        const all =
                            await read("RC_AllContracts") === true;

                        const contracts =
                            await read("RC_Contracts") || [];

                        if (!name || !code) {
                            showError(
                                context,
                                "English Name and Resource Code are required."
                            );
                            return;
                        }

                        if (!categoryId) {
                            showError(
                                context,
                                "Please select a Category."
                            );
                            return;
                        }

                        if (
                            [min, max, increment].some(
                                v => v !== null &&
                                (!Number.isFinite(v) || v < 0)
                            )
                        ) {
                            showError(
                                context,
                                "Numeric values must be zero or greater."
                            );
                            return;
                        }

                        if (
                            min !== null &&
                            max !== null &&
                            min > max
                        ) {
                            showError(
                                context,
                                "Min Value cannot exceed Max Value."
                            );
                            return;
                        }

                        if (
                            increment !== null &&
                            increment <= 0
                        ) {
                            showError(
                                context,
                                "Increment must be greater than zero."
                            );
                            return;
                        }

                        if (start && end && end < start) {
                            showError(
                                context,
                                "End Date cannot be earlier than Creation Date."
                            );
                            return;
                        }

                        if (!all && contracts.length === 0) {
                            showError(
                                context,
                                "Select at least one contract or choose All Contracts."
                            );
                            return;
                        }

                        context.RC_Saving = true;
                        context.RC_ErrorVisible = false;

                        let resourceSaved = false;

                        try {
                            const model = await sdk.Model.create(RESOURCE);
                            const editingId = await read("RC_RecordId");

                            const duplicates = await model.load({
                                attributes: ["Id"],
                                parameters: await parametersByColumn(
                                    "UsrCode",
                                    code
                                )
                            });

                            if (duplicates.some(
                                record => record.Id !== editingId
                            )) {
                                throw new Error(
                                    "Resource Code already exists."
                                );
                            }

                            const payload = {
                                Name: name,
                                UsrArabicName:
                                    await read("RC_ArabicName") || "",
                                UsrCode: code,
                                UsrCategory: categoryId,
                                UsrUnit: await read("RC_Unit") || "",
                                UsrMinValue: min,
                                UsrMaxValue: max,
                                UsrIncrement: increment,
                                UsrStartDate: start,
                                UsrEndDate: end,
                                UsrAllContracts: all,
                                UsrActive:
                                    await read("RC_Active") === true
                            };

                            let resourceId = editingId;

                            if (editingId) {
                                const result = await model.update(
                                    payload,
                                    await parametersById(editingId)
                                );

                                if (!result?.success) {
                                    throw new Error(
                                        "Resource update failed."
                                    );
                                }

                            } else {
                                const result = await model.insert(payload);

                                if (!result?.success) {
                                    throw new Error(
                                        "Resource creation failed."
                                    );
                                }

                                resourceId =
                                    result.primaryAttributes?.[0]?.Id;

                                if (!resourceId) {
                                    throw new Error(
                                        "Created record ID was not returned."
                                    );
                                }
                            }

                            resourceSaved = true;

                            await synchronizeContracts(
                                resourceId,
                                contracts,
                                all
                            );

                            await clearForm(context);

                            context.RC_EditorVisible = false;
                            context.RC_TableVisible = true;

                            await refreshTable(context);
                            await updateStatistics(context);

                        } catch (e) {
                            console.error("Save resource:", e);

                            showError(
                                context,
                                resourceSaved
                                    ? "Resource saved, but contract synchronization or refresh failed: " +
                                        e.message
                                    : e.message || "Resource save failed."
                            );
                        } finally {
                            context.RC_Saving = false;
                        }
                    }
                },
                {
                    request: "usr.RC_ToggleStatus",
                    handler: async request => {
                        const context = request.$context;
                        const id = getId(request.recordId);

                        if (!id) return;

                        try {
                            const model = await sdk.Model.create(RESOURCE);

                            const rows = await model.load({
                                attributes: [
                                    "Id", "UsrActive"
                                ],
                                parameters: await parametersById(id)
                            });

                            if (!rows.length) return;

                            const result = await model.update(
                                {
                                    UsrActive: !rows[0].UsrActive
                                },
                                await parametersById(id)
                            );

                            if (!result?.success) {
                                throw new Error(
                                    "Status update failed."
                                );
                            }

                            await refreshTable(context);
                            await updateStatistics(context);

                        } catch (e) {
                            console.error("Toggle Resource status:", e);
                        }
                    }
                }

            ]/**SCHEMA_HANDLERS*/,

            converters: /**SCHEMA_CONVERTERS*/{
            }/**SCHEMA_CONVERTERS*/,

            validators: /**SCHEMA_VALIDATORS*/{
            }/**SCHEMA_VALIDATORS*/
        };
    }
);
