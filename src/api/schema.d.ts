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
            /** Brief */
            brief?: {
                [key: string]: string;
            } | null;
            /** Previous Brief */
            previous_brief?: {
                [key: string]: string;
            } | null;
            /** Decision Options */
            decision_options?: string[][] | null;
            /** Report Sha256 */
            report_sha256?: string | null;
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
            /**
             * Mode
             * @default expert
             * @enum {string}
             */
            mode?: "auto" | "expert";
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
        /** RevisionTask */
        RevisionTask: {
            /**
             * Node
             * @enum {string}
             */
            node: "literature" | "data_search" | "ideas" | "refine" | "experiment_plan" | "paper_plan" | "paper_figure" | "paper_write" | "paper_compile" | "improvement";
            /** Target */
            target: string;
            /** Instruction */
            instruction: string;
            /** Files */
            files: string[];
            /**
             * Compile Pdf
             * @default false
             */
            compile_pdf?: boolean;
        };
        /** RunCreate */
        RunCreate: {
            /**
             * Action
             * @default start
             * @enum {string}
             */
            action?: "start" | "resume" | "review" | "revise" | "proposal_revise" | "proposal_approve";
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
             * @default 100
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
            node_task?: components["schemas"]["RevisionTask"] | null;
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
             * Task Prompt
             * @default
             */
            task_prompt?: string;
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
