export interface paths {
    "/api/auth/session": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Session */
        get: operations["session_api_auth_session_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Login */
        post: operations["login_api_auth_login_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Logout */
        post: operations["logout_api_auth_logout_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/libraries/{library}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Library */
        get: operations["list_library_api_libraries__library__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/libraries/{library}/document": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read Document */
        get: operations["read_document_api_libraries__library__document_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/libraries/{library}/asset": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read Asset */
        get: operations["read_asset_api_libraries__library__asset_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/libraries/paradigms/graph": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Paradigm Graph
         * @description Expose recorded wiki relationships, never infer scientific links from labels.
         */
        get: operations["paradigm_graph_api_libraries_paradigms_graph_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/libraries/paradigms/figures": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Paradigm Figures
         * @description Read archived figure images and their original caption sidecars.
         */
        get: operations["paradigm_figures_api_libraries_paradigms_figures_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/proposal-overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read Proposal Overview */
        get: operations["read_proposal_overview_api_projects__project_id__proposal_overview_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/idea-canvas/apply": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Apply Canvas
         * @description Adopt a reviewed automatic-mode design without starting downstream work.
         */
        post: operations["apply_canvas_api_projects__project_id__idea_canvas_apply_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/idea-canvas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read Canvas */
        get: operations["read_canvas_api_projects__project_id__idea_canvas_get"];
        /** Save Canvas */
        put: operations["save_canvas_api_projects__project_id__idea_canvas_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/laboratory/sources": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Laboratory Sources */
        get: operations["laboratory_sources_api_laboratory_sources_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/laboratory/sources/{source_id}/snapshot": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Laboratory Snapshot */
        get: operations["laboratory_snapshot_api_laboratory_sources__source_id__snapshot_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/laboratory/bts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Bts Snapshot
         * @deprecated
         */
        get: operations["bts_snapshot_api_laboratory_bts_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/laboratory/land": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Land Snapshot
         * @deprecated
         */
        get: operations["land_snapshot_api_laboratory_land_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Health */
        get: operations["health_api_health_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Projects */
        get: operations["projects_api_projects_get"];
        put?: never;
        /** Create Project */
        post: operations["create_project_api_projects_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Get Project */
        get: operations["get_project_api_projects__project_id__get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/runs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Start Run */
        post: operations["start_run_api_projects__project_id__runs_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/messages": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Send Message */
        post: operations["send_message_api_projects__project_id__messages_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/questions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Questions */
        get: operations["list_questions_api_projects__project_id__questions_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/questions/{question_id}/answer": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Answer Question */
        post: operations["answer_question_api_projects__project_id__questions__question_id__answer_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/stop": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Stop Run */
        post: operations["stop_run_api_projects__project_id__stop_post"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List Files */
        get: operations["list_files_api_projects__project_id__files_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Read File */
        get: operations["read_file_api_projects__project_id__file_get"];
        /** Edit File */
        put: operations["edit_file_api_projects__project_id__file_put"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/download": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Download */
        get: operations["download_api_projects__project_id__download_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/log": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Log Tail */
        get: operations["log_tail_api_projects__project_id__log_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/activity": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Activity
         * @description Page durable public execution events for chat history and polling recovery.
         */
        get: operations["activity_api_projects__project_id__activity_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/projects/{project_id}/events": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Events */
        get: operations["events_api_projects__project_id__events_get"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** AgentView */
        AgentView: {
            /** Role */
            role: string;
            /**
             * Status
             * @default idle
             */
            status?: string;
            /** Phase */
            phase?: string | null;
            /** Task Id */
            task_id?: string | null;
            /**
             * Instruction
             * @default
             */
            instruction?: string;
            /** Updated At */
            updated_at?: string | null;
            /** Error */
            error?: string | null;
            /**
             * Is Active
             * @default false
             */
            is_active?: boolean;
        };
        /** CanvasApply */
        CanvasApply: {
            /** Sha256 */
            sha256: string;
        };
        /** CanvasDraft */
        CanvasDraft: {
            /**
             * Version
             * @default 1
             */
            version?: number;
            /** Sourcehash */
            sourceHash: string;
            /** Nodes */
            nodes: components["schemas"]["CanvasNode"][];
            /** Edges */
            edges: components["schemas"]["CanvasEdge"][];
            /** Changes */
            changes?: string[];
            review?: components["schemas"]["ProposalReview"] | null;
        };
        /** CanvasEdge */
        CanvasEdge: {
            /** Id */
            id: string;
            /** Source */
            source: string;
            /** Target */
            target: string;
        };
        /** CanvasNode */
        CanvasNode: {
            /** Id */
            id: string;
            position: components["schemas"]["Position"];
            data: components["schemas"]["ModuleData"];
        };
        /** CanvasSave */
        CanvasSave: {
            /** Sha256 */
            sha256: string;
            draft: components["schemas"]["CanvasDraft"];
        };
        /** Capabilities */
        Capabilities: {
            /**
             * Discovery
             * @default false
             */
            discovery: boolean;
            /**
             * Status
             * @default false
             */
            status: boolean;
            /**
             * Measurements
             * @default false
             */
            measurements: boolean;
            /**
             * Records
             * @default false
             */
            records: boolean;
            /**
             * Protocols
             * @default false
             */
            protocols: boolean;
        };
        /** ChannelView */
        ChannelView: {
            /** Channel Id */
            channel_id: string;
            /** Unit Id */
            unit_id: string;
            /** Number */
            number: string;
            /**
             * Status
             * @default unknown
             */
            status: string;
            /**
             * State
             * @default unknown
             * @enum {string}
             */
            state: "running" | "finished" | "paused" | "stopped" | "idle" | "error" | "offline" | "unknown";
            /**
             * Status Label
             * @default 未知
             */
            status_label: string;
            /**
             * Status Stale
             * @default true
             */
            status_stale: boolean;
            /**
             * Measurements Stale
             * @default true
             */
            measurements_stale: boolean;
            /** Observed At */
            observed_at: string | null;
            /** Voltage V */
            voltage_v: number | null;
            /** Current A */
            current_a: number | null;
            /** Capacity Ah */
            capacity_ah: number | null;
            /** Energy Wh */
            energy_wh: number | null;
            /** Cycle */
            cycle: string | null;
            /** Step Type */
            step_type: string | null;
        };
        /** CheckpointView */
        CheckpointView: {
            /** Node */
            node: string;
            /**
             * Summary
             * @default
             */
            summary?: string;
            /** Questions */
            questions?: string[];
            /** Report */
            report: string;
            /** Files */
            files?: string[];
            /** Decision Options */
            decision_options?: string[][] | null;
            /** Report Sha256 */
            report_sha256?: string | null;
        };
        /** DeviceView */
        DeviceView: {
            /**
             * Source Id
             * @default
             */
            source_id: string;
            /**
             * Vendor
             * @default
             */
            vendor: string;
            /**
             * Name
             * @default
             */
            name: string;
            /**
             * Kind
             * @default cycler
             */
            kind: string;
            capabilities: components["schemas"]["Capabilities"];
            /** Id */
            id: string;
            /** Device Id */
            device_id: string;
            /** Device Type */
            device_type: string;
            /** Channels */
            channels: components["schemas"]["ChannelView"][];
        };
        /** FileEdit */
        FileEdit: {
            /** Content */
            content: string;
            /** Sha256 */
            sha256: string;
        };
        /** HTTPValidationError */
        HTTPValidationError: {
            /** Detail */
            detail?: components["schemas"]["ValidationError"][];
        };
        /** HealthView */
        HealthView: {
            /** Status */
            status: string;
            /** Runtime */
            runtime: string;
            /** Project Roots */
            project_roots: string[];
            /** Nodes */
            nodes: components["schemas"]["NodeView"][];
            /** Concurrency */
            concurrency: number;
        };
        /** HistoryView */
        HistoryView: {
            /** Node */
            node?: string | null;
            /** Timestamp */
            timestamp?: string | null;
        };
        /** Login */
        Login: {
            /** Username */
            username: string;
            /** Password */
            password: string;
        };
        /** MessageCreate */
        MessageCreate: {
            /** Prompt */
            prompt: string;
            /** Mode */
            mode?: ("auto" | "expert") | null;
            /** Model */
            model?: string | null;
        };
        /** ModuleData */
        ModuleData: {
            /** Title */
            title: string;
            /**
             * Purpose
             * @default
             */
            purpose?: string;
            /**
             * Input
             * @default
             */
            input?: string;
            /**
             * Steps
             * @default
             */
            steps?: string;
            /**
             * Output
             * @default
             */
            output?: string;
            /**
             * Parameters
             * @default
             */
            parameters?: string;
            /**
             * Limits
             * @default
             */
            limits?: string;
            /**
             * Example
             * @default
             */
            example?: string;
            /** Sectionids */
            sectionIds?: string[];
            /**
             * Sourcecontent
             * @default
             */
            sourceContent?: string;
            /**
             * Disabled
             * @default false
             */
            disabled?: boolean;
            /**
             * Needsreview
             * @default false
             */
            needsReview?: boolean;
        };
        /** NodeView */
        NodeView: {
            /** Id */
            id: string;
            /** Label */
            label: string;
        };
        /** Position */
        Position: {
            /** X */
            x: number;
            /** Y */
            y: number;
        };
        /** ProjectCreate */
        ProjectCreate: {
            /** Name */
            name: string;
            /** Path */
            path?: string | null;
        };
        /** ProjectView */
        ProjectView: {
            /** Id */
            id: string;
            /** Name */
            name: string;
            /** Path */
            path: string;
            /** Created At */
            created_at: string;
            /** Status */
            status: string;
            state: components["schemas"]["WorkflowView"];
            /** Progress */
            progress: {
                [key: string]: unknown;
            };
            /** Runs */
            runs: components["schemas"]["RunView"][];
            /** Checkpoint Token */
            checkpoint_token: string;
            /** Pending Questions */
            pending_questions?: components["schemas"]["QuestionView"][];
            /** Agents */
            agents?: components["schemas"]["AgentView"][];
        };
        /** ProposalReview */
        ProposalReview: {
            /** Sections */
            sections: components["schemas"]["ReviewSection"][];
            /**
             * Feedback
             * @default
             */
            feedback?: string;
        };
        /** QuestionAnswer */
        QuestionAnswer: {
            /** Task Id */
            task_id: string;
            /** Answer */
            answer: string;
        };
        /** QuestionView */
        QuestionView: {
            /** Id */
            id: string;
            /** Task Id */
            task_id: string;
            /** Role */
            role: string;
            /** Phase */
            phase: string;
            /** Question */
            question: string;
            /** Options */
            options?: string[];
            /** Status */
            status: string;
            /** Live */
            live: boolean;
            /** Created At */
            created_at: string;
        };
        /** ReviewSection */
        ReviewSection: {
            /** Id */
            id: string;
            /** Title */
            title: string;
            /** Summary */
            summary: string;
            /** Details */
            details: string;
            /**
             * Focus
             * @default false
             */
            focus?: boolean;
            /**
             * Edited
             * @default false
             */
            edited?: boolean;
        };
        /** RunCreate */
        RunCreate: {
            /**
             * Action
             * @default start
             * @enum {string}
             */
            action?: "start" | "resume" | "review" | "coordinate" | "proposal_revise" | "proposal_approve";
            /**
             * Prompt
             * @default
             */
            prompt?: string;
            /** Mode */
            mode?: ("auto" | "expert") | null;
            /** Start Node */
            start_node?: string | null;
            /** Stop After */
            stop_after?: string | null;
            /**
             * Max Tool Rounds
             * @default 300
             */
            max_tool_rounds?: number;
            /**
             * Timeout
             * @default 600
             */
            timeout?: number;
            /**
             * Paper Review Timeout
             * @default 1800
             */
            paper_review_timeout?: number;
            /**
             * Paper Review Round2 Timeout
             * @default 1200
             */
            paper_review_round2_timeout?: number;
            /** Model */
            model?: string | null;
            /**
             * Answer
             * @default
             */
            answer?: string;
            /** Checkpoint Token */
            checkpoint_token?: string | null;
            /** Proposal Sha256 */
            proposal_sha256?: string | null;
            stage_task?: components["schemas"]["StageAssignment"] | null;
        };
        /** RunView */
        RunView: {
            /** Id */
            id: string;
            /** Status */
            status: string;
            /** Created At */
            created_at: string;
            /** Finished At */
            finished_at?: string | null;
            /** Error */
            error?: string | null;
            /** Options */
            options: {
                [key: string]: unknown;
            };
        };
        /** SnapshotView */
        SnapshotView: {
            /**
             * Source Id
             * @default
             */
            source_id: string;
            /**
             * Label
             * @default
             */
            label: string;
            capabilities: components["schemas"]["Capabilities"];
            /**
             * Connection
             * @enum {string}
             */
            connection: "online" | "offline" | "unconfigured";
            /** Observed At */
            observed_at: string | null;
            /** Last Success At */
            last_success_at: string | null;
            /**
             * Stale
             * @default false
             */
            stale: boolean;
            /** Message */
            message: string | null;
            /** Devices */
            devices: components["schemas"]["DeviceView"][];
            /**
             * Discovery Only
             * @default false
             */
            discovery_only: boolean;
            /**
             * Status Available
             * @default false
             */
            status_available: boolean;
            /**
             * Measurements Available
             * @default false
             */
            measurements_available: boolean;
        };
        /** SourceView */
        SourceView: {
            /** Id */
            id: string;
            /** Label */
            label: string;
            /** Vendor */
            vendor: string;
            /**
             * Kind
             * @enum {string}
             */
            kind: "cycler" | "workstation";
            /**
             * Configured
             * @default false
             */
            configured: boolean;
        };
        /** StageAssignment */
        StageAssignment: {
            /**
             * Node
             * @enum {string}
             */
            node: "literature" | "data_search" | "ideas" | "refine" | "experiment_plan" | "experiment_bridge" | "paper_plan" | "paper_figure" | "paper_write" | "paper_compile" | "improvement";
            /** Instruction */
            instruction: string;
            /**
             * Role
             * @enum {string}
             */
            role: "idea_generator" | "experiment" | "paper_writer" | "wiki_agent";
            /**
             * Full Stage
             * @description 完整研究阶段为true；普通修改、检查或问答任务为false，不套用整阶段验收。
             * @default false
             */
            full_stage?: boolean;
        };
        /** ValidationError */
        ValidationError: {
            /** Location */
            loc: (string | number)[];
            /** Message */
            msg: string;
            /** Error Type */
            type: string;
            /** Input */
            input?: unknown;
            /** Context */
            ctx?: Record<string, never>;
        };
        /** WorkflowView */
        WorkflowView: {
            /** Status */
            status?: string | null;
            /** Current Node */
            current_node?: string | null;
            /**
             * Project Goal
             * @default
             */
            project_goal?: string;
            /** Mode */
            mode?: string | null;
            /** History */
            history?: components["schemas"]["HistoryView"][];
            expert_checkpoint?: components["schemas"]["CheckpointView"] | null;
            /** Error */
            error?: string | null;
            /** Paper Status */
            paper_status?: string | null;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    session_api_auth_session_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    login_api_auth_login_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["Login"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    logout_api_auth_logout_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    list_library_api_libraries__library__get: {
        parameters: {
            query?: {
                q?: string;
                category?: string;
                limit?: number;
            };
            header?: never;
            path: {
                library: "paradigms" | "battery";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    read_document_api_libraries__library__document_get: {
        parameters: {
            query: {
                path: string;
            };
            header?: never;
            path: {
                library: "paradigms" | "battery";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    read_asset_api_libraries__library__asset_get: {
        parameters: {
            query: {
                path: string;
            };
            header?: never;
            path: {
                library: "paradigms" | "battery";
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    paradigm_graph_api_libraries_paradigms_graph_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    paradigm_figures_api_libraries_paradigms_figures_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
        };
    };
    read_proposal_overview_api_projects__project_id__proposal_overview_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    apply_canvas_api_projects__project_id__idea_canvas_apply_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CanvasApply"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    read_canvas_api_projects__project_id__idea_canvas_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    save_canvas_api_projects__project_id__idea_canvas_put: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CanvasSave"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    laboratory_sources_api_laboratory_sources_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SourceView"][];
                };
            };
        };
    };
    laboratory_snapshot_api_laboratory_sources__source_id__snapshot_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                source_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SnapshotView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    bts_snapshot_api_laboratory_bts_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SnapshotView"];
                };
            };
        };
    };
    land_snapshot_api_laboratory_land_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SnapshotView"];
                };
            };
        };
    };
    health_api_health_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HealthView"];
                };
            };
        };
    };
    projects_api_projects_get: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectView"][];
                };
            };
        };
    };
    create_project_api_projects_post: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    get_project_api_projects__project_id__get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectView"];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    start_run_api_projects__project_id__runs_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RunCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    send_message_api_projects__project_id__messages_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["MessageCreate"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_questions_api_projects__project_id__questions_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuestionView"][];
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    answer_question_api_projects__project_id__questions__question_id__answer_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
                question_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["QuestionAnswer"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    stop_run_api_projects__project_id__stop_post: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    list_files_api_projects__project_id__files_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    read_file_api_projects__project_id__file_get: {
        parameters: {
            query: {
                path: string;
            };
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    edit_file_api_projects__project_id__file_put: {
        parameters: {
            query: {
                path: string;
            };
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FileEdit"];
            };
        };
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    download_api_projects__project_id__download_get: {
        parameters: {
            query: {
                path: string;
            };
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    log_tail_api_projects__project_id__log_get: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    activity_api_projects__project_id__activity_get: {
        parameters: {
            query?: {
                role?: string | null;
                before?: number | null;
                after?: number | null;
                limit?: number;
            };
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
    events_api_projects__project_id__events_get: {
        parameters: {
            query?: {
                after?: number;
            };
            header?: never;
            path: {
                project_id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": unknown;
                };
            };
            /** @description Validation Error */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["HTTPValidationError"];
                };
            };
        };
    };
}
