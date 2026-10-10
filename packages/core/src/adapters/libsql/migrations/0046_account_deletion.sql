DROP TRIGGER IF EXISTS projection_search_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS projection_search_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS projection_search_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS projection_control_version;
--> statement-breakpoint
DROP TRIGGER IF EXISTS tags_revision_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS tags_revision_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS note_tags_revision_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS note_tags_revision_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS note_tags_revision_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS tags_meaning_revision;
--> statement-breakpoint
DROP TRIGGER IF EXISTS notes_lifecycle_tag_revision;
--> statement-breakpoint
DROP TRIGGER IF EXISTS notes_ownership_generation_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS notes_ownership_generation_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS notes_resource_revision_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS notes_resource_revision_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS workspaces_membership_revision_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS workspaces_membership_revision_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS source_bundles_content_revision_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS source_bundles_content_revision_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS bundle_scope_holdings_revision_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS bundle_scope_holdings_revision_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS write_ownership_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS write_ownership_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS draft_rebind_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS write_first_bind;
--> statement-breakpoint
DROP TRIGGER IF EXISTS reference_job_ownership;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_originals_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_originals_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_originals_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_assets_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_assets_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_assets_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_media_uploads_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_media_uploads_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_media_uploads_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_reference_objects_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_reference_objects_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_reference_objects_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_note_asset_references_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_note_asset_references_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_note_asset_references_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_reference_settings_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_reference_settings_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_reference_settings_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS move_resource_bind;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_counts_revision;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_values_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_values_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_source_bundles_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_source_bundles_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_upload_reservations_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_upload_reservations_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_upload_reservations_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_reference_settings_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_reference_settings_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_reference_settings_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_companion_sources_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_companion_sources_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_companion_sources_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS holding_note_move;
--> statement-breakpoint
DROP TRIGGER IF EXISTS batch_header_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS batch_header_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS batch_attempt_number_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS batch_attempt_number_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS batch_attempt_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS batch_attempt_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS batch_receipt_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS membership_revision_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS membership_revision_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS membership_revision_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS note_sharing_initialize;
--> statement-breakpoint
DROP TRIGGER IF EXISTS note_sharing_required;
--> statement-breakpoint
DROP TRIGGER IF EXISTS note_public_identity_required_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS note_public_identity_required_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS note_public_identity_preserve;
--> statement-breakpoint
DROP TRIGGER IF EXISTS note_public_identity_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS profile_icon_pointer_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS profile_icon_pointer_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS profile_icon_ready_preserve;
--> statement-breakpoint
DROP TRIGGER IF EXISTS workspace_public_active_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS workspace_public_active_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS workspace_public_slug_required;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_computation_identity_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_computation_debt_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_artifact_identity_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_artifact_binding_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_artifact_debt_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_artifact_file_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_artifact_file_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_request_identity_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_request_binding_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_request_result_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_request_unbind;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_delivery_binding_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_delivery_identity_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_delivery_active_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_anonymous_request_identity;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_anonymous_request_binding;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_anonymous_request_result;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_anonymous_request_auto;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_anonymous_request_auto_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_anonymous_request_unbind;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_anonymous_request_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_anonymous_delivery_binding;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_anonymous_delivery_identity;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_anonymous_delivery_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_anonymous_delivery_close;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_delivery_shared_capacity;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_anonymous_delivery_shared_capacity;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_request_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_run_parent;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_run_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_target_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_target_live_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_attempt_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_attempt_terminal;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_ref_ready_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_ref_ready_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_spool_cleanup_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_spool_close_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_spool_no_resurrect;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_assembly_close_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_assembly_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_artifact_assembly;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_artifact_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_artifact_remove_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_entry_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_entry_live_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_delivery_capacity;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_delivery_artifact;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_delivery_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_delivery_close_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_request_terminal_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_run_publish_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_requests_integer_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_requests_integer_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_runs_integer_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_runs_integer_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_targets_integer_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_targets_integer_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_attempts_integer_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_attempts_integer_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_spools_integer_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_spools_integer_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_spool_refs_integer_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_spool_refs_integer_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_assemblies_integer_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_assemblies_integer_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_artifacts_integer_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_artifacts_integer_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_artifact_entries_integer_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_artifact_entries_integer_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_deliveries_integer_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_deliveries_integer_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_run_exclusions_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_run_exclusions_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_run_results_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_attempt_title_scrub;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_pdf_binding_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_pdf_binding_shape;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_pdf_binding_attach;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_pdf_binding_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_pdf_binding_ready;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_pdf_binding_release;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_pdf_hold_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_pdf_hold_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_pdf_hold_release;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_pdf_hold_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS pdf_artifact_zip_hold;
--> statement-breakpoint
DROP TRIGGER IF EXISTS object_delete_zip_pdf_hold;
--> statement-breakpoint
DROP TRIGGER IF EXISTS zip_run_pdf_terminal;
--> statement-breakpoint
DROP TRIGGER IF EXISTS auth_password_last_method;
--> statement-breakpoint
DROP TRIGGER IF EXISTS auth_google_last_method;
--> statement-breakpoint
DROP TRIGGER IF EXISTS auth_google_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS auth_version_monotonic;
--> statement-breakpoint
DROP TRIGGER IF EXISTS auth_browser_monotonic;
--> statement-breakpoint
DROP TRIGGER IF EXISTS auth_browser_pinned;
--> statement-breakpoint
DROP TRIGGER IF EXISTS auth_session_browser_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS auth_session_browser_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS auth_attempt_shape_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS auth_attempt_shape_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS auth_attempt_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS auth_challenge_shape_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS auth_challenge_immutable;
--> statement-breakpoint
DROP TRIGGER IF EXISTS openrouter_connection_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS openrouter_attempt_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS openrouter_attempt_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS openrouter_models_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_reservation_identity;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_fence_monotonic;
--> statement-breakpoint
DROP TRIGGER IF EXISTS openrouter_attempt_admission_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_conversion_pin;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_dispatch_intent;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_dispatch_pin;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_reservation_release;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_dispatch_identity;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_dispatch_recipe;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_conversion_queue;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_pdf_preview_admission;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_pdf_preview_consume;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_pdf_preview_pin;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_connection_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_attempt_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_attempt_delete_owner_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_control_delete_owner_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_attempt_command_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_control_command_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_control_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_request_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_target_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_target_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_job_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_job_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_job_delete_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_transfer_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_transfer_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_transfer_claim_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_transfer_delete_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_record_insert_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_record_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_record_delete_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_request_family_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_request_update_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_job_admission_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_request_retry_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_job_admission_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_head_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_head_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_head_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_target_head_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_target_head_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_job_head_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_transfer_head_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_transfer_head_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_record_head_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_conversion_identity;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_pdf_preview_identity;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_pdf_preview_ready;
--> statement-breakpoint
DROP TRIGGER IF EXISTS regeneration_binding_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS regeneration_binding_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS regeneration_attempt_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS regeneration_attempt_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS regeneration_attempt_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS machine_regeneration_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS machine_regeneration_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS machine_regeneration_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_conversions_source_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_conversions_source_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_conversions_source_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_pdf_previews_source_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_pdf_previews_source_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS llm_pdf_previews_source_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS machine_regenerations_source_insert;
--> statement-breakpoint
DROP TRIGGER IF EXISTS machine_regenerations_source_update;
--> statement-breakpoint
DROP TRIGGER IF EXISTS machine_regenerations_source_delete;
--> statement-breakpoint
DROP TRIGGER IF EXISTS regeneration_attempt_claim_guard;
--> statement-breakpoint
DROP TRIGGER IF EXISTS drive_backup_source_lane_guard;
--> statement-breakpoint
CREATE TABLE `account_deletion_debts` (
	`intent_id` text NOT NULL,
	`kind` text NOT NULL,
	`owner_id` text NOT NULL,
	`locator` text NOT NULL,
	PRIMARY KEY(`intent_id`, `kind`, `owner_id`, `locator`),
	FOREIGN KEY (`intent_id`) REFERENCES `account_deletions`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "account_deletion_debt_shape" CHECK("account_deletion_debts"."kind" in('source-attempt','input','drive-attempt','drive-control','drive-transfer','object-write','purge') and length(cast("account_deletion_debts"."owner_id" as blob)) between 1 and 256 and length(cast("account_deletion_debts"."locator" as blob)) between 1 and 4096 and json_valid("account_deletion_debts"."locator") and json_type("account_deletion_debts"."locator",'$.table')='text' and json_extract("account_deletion_debts"."locator",'$.id')="account_deletion_debts"."owner_id")
);

--> statement-breakpoint
CREATE TABLE `account_deletion_purges` (
	`intent_id` text NOT NULL,
	`note_id` text NOT NULL,
	`purge_id` text NOT NULL,
	PRIMARY KEY(`intent_id`, `note_id`),
	FOREIGN KEY (`intent_id`) REFERENCES `account_deletions`(`id`) ON UPDATE no action ON DELETE restrict
);

--> statement-breakpoint
CREATE UNIQUE INDEX `account_deletion_purges_purge_id_unique` ON `account_deletion_purges` (`purge_id`);
--> statement-breakpoint
CREATE TABLE `account_deletions` (
	`id` text PRIMARY KEY NOT NULL,
	`account_id` text NOT NULL,
	`fence_auth_version` integer NOT NULL,
	`state` text NOT NULL,
	`cursor_table` text NOT NULL,
	`cursor_after_id` text,
	`version` integer NOT NULL,
	`accepted_at` integer NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`lease_token` text,
	`lease_until` integer,
	`last_failure_code` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "account_deletion_version" CHECK("account_deletions"."version" between 1 and 9007199254740991 and "account_deletions"."fence_auth_version" between 2 and 9007199254740991),
	CONSTRAINT "account_deletion_cursor" CHECK("account_deletions"."cursor_table" in('personal-notes','uploads','media-drafts','profile-icons','exports','source-attempts','source-bindings','drive-attempts','drive-controls','drive-transfers','drive-heads','drive-jobs','drive-targets','drive-records','google-attempts','auth-challenges','email-verifications','google-identities','openrouter-attempts','openrouter-connection','drive-connection','profile','credential-origins','credential-uses','drive-acknowledgments','verify') and ("account_deletions"."cursor_after_id" is null or length(cast("account_deletions"."cursor_after_id" as blob)) between 1 and 256) and ("account_deletions"."state"!='succeeded' or ("account_deletions"."cursor_table"='verify' and "account_deletions"."cursor_after_id" is null))),
	CONSTRAINT "account_deletion_failure" CHECK("account_deletions"."last_failure_code" is null or "account_deletions"."last_failure_code"='step-failed'),
	CONSTRAINT "account_deletion_lease" CHECK(("account_deletions"."state"='running' and "account_deletions"."lease_token" is not null and "account_deletions"."lease_until">"account_deletions"."accepted_at") or ("account_deletions"."state" in ('queued','waiting-owner','succeeded') and "account_deletions"."lease_token" is null and "account_deletions"."lease_until" is null))
);

--> statement-breakpoint
CREATE UNIQUE INDEX `account_deletions_account_id_unique` ON `account_deletions` (`account_id`);
--> statement-breakpoint
CREATE INDEX `account_deletion_claim` ON `account_deletions` (`state`,`next_attempt_at`,`id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_deletion_identity` ON `account_deletions` (`id`,`account_id`);
--> statement-breakpoint
CREATE TABLE `account_deletion_credential_origins` (
	`provider` text NOT NULL,
	`account_id` text NOT NULL,
	`mode` text NOT NULL,
	`use_id` text,
	`credential_epoch` integer,
	PRIMARY KEY(`provider`, `account_id`),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`use_id`) REFERENCES `account_deletion_credential_uses`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "credential_origin_shape" CHECK(("account_deletion_credential_origins"."mode"='legacy-unproven' and "account_deletion_credential_origins"."use_id" is null and "account_deletion_credential_origins"."credential_epoch" is null) or ("account_deletion_credential_origins"."mode"='native-v1' and "account_deletion_credential_origins"."use_id" is not null and (("account_deletion_credential_origins"."provider"='google' and "account_deletion_credential_origins"."credential_epoch" is null) or ("account_deletion_credential_origins"."provider"='openrouter' and "account_deletion_credential_origins"."credential_epoch" between 1 and 9007199254740991))))
);

--> statement-breakpoint
CREATE TABLE `account_deletion_credential_uses` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`binding` text NOT NULL,
	`account_id` text,
	`result_account_id` text,
	`source_id` text NOT NULL,
	`runtime_id` text NOT NULL,
	`owner_token` text NOT NULL,
	`generation` integer NOT NULL,
	`version` integer NOT NULL,
	`state` text NOT NULL,
	`caller_ended` integer NOT NULL,
	`acknowledged` integer NOT NULL,
	`evidence_id` text,
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`result_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "credential_use_version" CHECK("account_deletion_credential_uses"."version" between 1 and 9007199254740991 and "account_deletion_credential_uses"."generation"=1 and length(cast("account_deletion_credential_uses"."runtime_id" as blob)) between 1 and 128 and length(cast("account_deletion_credential_uses"."owner_token" as blob)) between 1 and 128),
	CONSTRAINT "credential_use_state" CHECK(("account_deletion_credential_uses"."state" in('active','unknown') and "account_deletion_credential_uses"."caller_ended"=0 and "account_deletion_credential_uses"."acknowledged"=0 and "account_deletion_credential_uses"."evidence_id" is null) or ("account_deletion_credential_uses"."state"='closed' and "account_deletion_credential_uses"."caller_ended"=1 and "account_deletion_credential_uses"."acknowledged" in(0,1) and "account_deletion_credential_uses"."evidence_id" is not null)),
	CONSTRAINT "credential_use_binding" CHECK(coalesce(json_valid("account_deletion_credential_uses"."binding") and json_extract("account_deletion_credential_uses"."binding",'$.provider')="account_deletion_credential_uses"."provider" and json_extract("account_deletion_credential_uses"."binding",'$.source.id')="account_deletion_credential_uses"."source_id" and json_extract("account_deletion_credential_uses"."binding",'$.source.version') between 1 and 9007199254740991 and ((json_extract("account_deletion_credential_uses"."binding",'$.authority.kind')='account' and json_extract("account_deletion_credential_uses"."binding",'$.authority.accountId')="account_deletion_credential_uses"."account_id" and "account_deletion_credential_uses"."account_id" is not null and json_extract("account_deletion_credential_uses"."binding",'$.authority.authVersion') between 1 and 9007199254740991) or ("account_deletion_credential_uses"."provider"='google' and json_extract("account_deletion_credential_uses"."binding",'$.authority.kind')='unresolved-google' and "account_deletion_credential_uses"."account_id" is null and json_type("account_deletion_credential_uses"."binding",'$.authority.accountId')='null' and json_type("account_deletion_credential_uses"."binding",'$.authority.authVersion')='null')),0))
);

--> statement-breakpoint
CREATE INDEX `credential_use_pending` ON `account_deletion_credential_uses` (`provider`,`acknowledged`,`id`);
--> statement-breakpoint
CREATE INDEX `credential_use_account` ON `account_deletion_credential_uses` (`account_id`,`state`);
--> statement-breakpoint
CREATE INDEX `credential_use_result_account` ON `account_deletion_credential_uses` (`result_account_id`,`state`);
--> statement-breakpoint
CREATE INDEX `credential_use_source` ON `account_deletion_credential_uses` (`source_id`,`provider`);
--> statement-breakpoint
CREATE TABLE `account_deletion_drive_acknowledgments` (
	`kind` text NOT NULL,
	`id` text NOT NULL,
	`account_id` text NOT NULL,
	`runtime_generation` text NOT NULL,
	`owner_token` text NOT NULL,
	`evidence_id` text NOT NULL,
	PRIMARY KEY(`kind`, `id`, `runtime_generation`, `owner_token`),
	FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "account_deletion_drive_ack_shape" CHECK("account_deletion_drive_acknowledgments"."kind" in('authorization','control','backup') and length(cast("account_deletion_drive_acknowledgments"."id" as blob)) between 1 and 256 and length(cast("account_deletion_drive_acknowledgments"."runtime_generation" as blob)) between 1 and 128 and length(cast("account_deletion_drive_acknowledgments"."owner_token" as blob)) between 1 and 128 and length(cast("account_deletion_drive_acknowledgments"."evidence_id" as blob)) between 1 and 128)
);

--> statement-breakpoint
CREATE INDEX `account_deletion_drive_ack_account` ON `account_deletion_drive_acknowledgments` (`account_id`,`kind`,`id`);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_drive_backup_records` (
	`id` text PRIMARY KEY NOT NULL,
	`retention` text DEFAULT 'usable' NOT NULL,
	`deletion_id` text,
	`redaction_version` integer DEFAULT 0 NOT NULL,
	`version` integer NOT NULL,
	`target_id` text NOT NULL,
	`note_id` text NOT NULL,
	`original_id` text NOT NULL,
	`account_id` text NOT NULL,
	`subject` text,
	`file_id` text,
	`folder` text,
	`bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`created_at` integer NOT NULL,
	`web_view_link` text,
	`resource_key_envelope` text,
	FOREIGN KEY (`deletion_id`) REFERENCES `account_deletions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`target_id`) REFERENCES `drive_backup_targets`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`original_id`) REFERENCES `originals`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "drive_backup_record_shape" CHECK("__new_drive_backup_records"."version"=1 and "__new_drive_backup_records"."bytes" between 1 and 209715200 and length("__new_drive_backup_records"."sha256")=64 and "__new_drive_backup_records"."sha256" not glob '*[^a-f0-9]*' and (("__new_drive_backup_records"."retention"='usable' and "__new_drive_backup_records"."deletion_id" is null and "__new_drive_backup_records"."redaction_version"=0 and length("__new_drive_backup_records"."subject") between 1 and 255 and length("__new_drive_backup_records"."file_id") between 1 and 1024 and json_valid("__new_drive_backup_records"."folder")) or ("__new_drive_backup_records"."retention"='recorder-deleted' and "__new_drive_backup_records"."deletion_id" is not null and "__new_drive_backup_records"."redaction_version"=1 and "__new_drive_backup_records"."subject" is null and "__new_drive_backup_records"."file_id" is null and "__new_drive_backup_records"."folder" is null and "__new_drive_backup_records"."web_view_link" is null and "__new_drive_backup_records"."resource_key_envelope" is null)))
);

--> statement-breakpoint
INSERT INTO `__new_drive_backup_records`("id", "retention", "deletion_id", "redaction_version", "version", "target_id", "note_id", "original_id", "account_id", "subject", "file_id", "folder", "bytes", "sha256", "created_at", "web_view_link", "resource_key_envelope") SELECT "id", 'usable', NULL, 0, "version", "target_id", "note_id", "original_id", "account_id", "subject", "file_id", "folder", "bytes", "sha256", "created_at", "web_view_link", "resource_key_envelope" FROM `drive_backup_records`;
--> statement-breakpoint
DROP TABLE `drive_backup_records`;
--> statement-breakpoint
ALTER TABLE `__new_drive_backup_records` RENAME TO `drive_backup_records`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
--> statement-breakpoint
CREATE UNIQUE INDEX `drive_backup_record_target` ON `drive_backup_records` (`target_id`);
--> statement-breakpoint
CREATE INDEX `drive_backup_record_note` ON `drive_backup_records` (`note_id`,`account_id`);
--> statement-breakpoint
CREATE TABLE `__new_drive_backup_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`retention` text DEFAULT 'usable' NOT NULL,
	`deletion_id` text,
	`redaction_version` integer DEFAULT 0 NOT NULL,
	`original_id` text NOT NULL,
	`note_id` text NOT NULL,
	`account_id` text NOT NULL,
	`subject` text,
	`marker` text,
	`folder` text,
	`folder_epoch` integer NOT NULL,
	`file_id` text,
	`state` text NOT NULL,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`deletion_id`) REFERENCES `account_deletions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`original_id`) REFERENCES `originals`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "drive_backup_target_shape" CHECK(coalesce("__new_drive_backup_targets"."version" between 1 and 9007199254740991 and "__new_drive_backup_targets"."folder_epoch" between 1 and 9007199254740991 and "__new_drive_backup_targets"."updated_at" >= "__new_drive_backup_targets"."created_at" and (("__new_drive_backup_targets"."retention"='usable' and "__new_drive_backup_targets"."deletion_id" is null and "__new_drive_backup_targets"."redaction_version"=0 and length("__new_drive_backup_targets"."subject") between 1 and 255 and "__new_drive_backup_targets"."marker" is not null and json_valid("__new_drive_backup_targets"."folder") and (("__new_drive_backup_targets"."state"='unallocated' and "__new_drive_backup_targets"."file_id" is null) or ("__new_drive_backup_targets"."state" in ('allocated','unknown','confirmed') and length("__new_drive_backup_targets"."file_id") between 1 and 1024))) or ("__new_drive_backup_targets"."retention"='recorder-deleted' and "__new_drive_backup_targets"."deletion_id" is not null and "__new_drive_backup_targets"."redaction_version"=1 and "__new_drive_backup_targets"."subject" is null and "__new_drive_backup_targets"."marker" is null and "__new_drive_backup_targets"."folder" is null and "__new_drive_backup_targets"."file_id" is null)),0))
);

--> statement-breakpoint
INSERT INTO `__new_drive_backup_targets`("id", "retention", "deletion_id", "redaction_version", "original_id", "note_id", "account_id", "subject", "marker", "folder", "folder_epoch", "file_id", "state", "version", "created_at", "updated_at") SELECT "id", 'usable', NULL, 0, "original_id", "note_id", "account_id", "subject", "marker", "folder", "folder_epoch", "file_id", "state", "version", "created_at", "updated_at" FROM `drive_backup_targets`;
--> statement-breakpoint
DROP TABLE `drive_backup_targets`;
--> statement-breakpoint
ALTER TABLE `__new_drive_backup_targets` RENAME TO `drive_backup_targets`;
--> statement-breakpoint
CREATE UNIQUE INDEX `drive_backup_target_head_identity` ON `drive_backup_targets` (`id`,`original_id`,`account_id`,`subject`);
--> statement-breakpoint
CREATE UNIQUE INDEX `drive_backup_target_file` ON `drive_backup_targets` (`file_id`);
--> statement-breakpoint
CREATE TABLE `__new_note_purges` (
	`id` text PRIMARY KEY NOT NULL,
	`note_id` text NOT NULL,
	`account_id` text,
	`workspace_id` text,
	`operation_id` text NOT NULL,
	`title` text NOT NULL,
	`cause` text NOT NULL,
	`workspace_deletion_id` text,
	`account_deletion_id` text,
	`deleted_account_id` text,
	`state` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`lease_token` text,
	`lease_until` integer,
	`completed` integer DEFAULT 0 NOT NULL,
	`total` integer DEFAULT 0 NOT NULL,
	`failure` text,
	`recoveries` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`account_deletion_id`) REFERENCES `account_deletions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`deleted_account_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "purge_manual_actor" CHECK((("__new_note_purges"."cause"='manual' AND "__new_note_purges"."account_id" IS NOT NULL AND "__new_note_purges"."workspace_deletion_id" IS NULL) OR ("__new_note_purges"."cause"='expired' AND "__new_note_purges"."workspace_deletion_id" IS NULL) OR ("__new_note_purges"."cause"='workspace-deletion' AND "__new_note_purges"."account_id" IS NULL AND "__new_note_purges"."workspace_deletion_id" IS NOT NULL AND "__new_note_purges"."workspace_id" IS NOT NULL)) AND "__new_note_purges"."account_deletion_id" IS NULL AND "__new_note_purges"."deleted_account_id" IS NULL OR ("__new_note_purges"."cause"='account-deletion' AND "__new_note_purges"."account_id" IS NULL AND "__new_note_purges"."workspace_id" IS NULL AND "__new_note_purges"."workspace_deletion_id" IS NULL AND "__new_note_purges"."account_deletion_id" IS NOT NULL AND "__new_note_purges"."deleted_account_id" IS NOT NULL))
);

--> statement-breakpoint
INSERT INTO `__new_note_purges`("id", "note_id", "account_id", "workspace_id", "operation_id", "title", "cause", "workspace_deletion_id", "account_deletion_id", "deleted_account_id", "state", "created_at", "updated_at", "next_attempt_at", "lease_token", "lease_until", "completed", "total", "failure", "recoveries") SELECT "id", "note_id", "account_id", "workspace_id", "operation_id", "title", "cause", "workspace_deletion_id", NULL, NULL, "state", "created_at", "updated_at", "next_attempt_at", "lease_token", "lease_until", "completed", "total", "failure", "recoveries" FROM `note_purges`;
--> statement-breakpoint
DROP TABLE `note_purges`;
--> statement-breakpoint
ALTER TABLE `__new_note_purges` RENAME TO `note_purges`;
--> statement-breakpoint
CREATE UNIQUE INDEX `note_purges_note_id_unique` ON `note_purges` (`note_id`);
--> statement-breakpoint
CREATE INDEX `purge_claim` ON `note_purges` (`state`,`next_attempt_at`);
--> statement-breakpoint
CREATE TABLE `__new_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text DEFAULT 'active' NOT NULL,
	`deletion_id` text,
	`email` text,
	`password_hash` text,
	`auth_version` integer DEFAULT 1 NOT NULL,
	`created_at` integer,
	`verified_at` integer,
	CONSTRAINT "account_saved_state" CHECK(("__new_accounts"."state"='active' and "__new_accounts"."email" is not null and "__new_accounts"."created_at" is not null and "__new_accounts"."deletion_id" is null) or ("__new_accounts"."state"='deleted' and "__new_accounts"."email" is null and "__new_accounts"."password_hash" is null and "__new_accounts"."created_at" is null and "__new_accounts"."verified_at" is null and "__new_accounts"."deletion_id" is not null)),
	CONSTRAINT "account_auth_version" CHECK("__new_accounts"."auth_version" between 1 and 9007199254740991)
);

--> statement-breakpoint
INSERT INTO `__new_accounts`("id", "state", "deletion_id", "email", "password_hash", "auth_version", "created_at", "verified_at") SELECT "id", 'active', NULL, "email", "password_hash", "auth_version", "created_at", "verified_at" FROM `accounts`;
--> statement-breakpoint
DROP TABLE `accounts`;
--> statement-breakpoint
ALTER TABLE `__new_accounts` RENAME TO `accounts`;
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_email_unique` ON `accounts` (`email`);
--> statement-breakpoint
CREATE TABLE `__new_regeneration_source_bindings` (
	`id` text PRIMARY KEY NOT NULL,
	`retention` text DEFAULT 'usable' NOT NULL,
	`deletion_id` text,
	`redaction_version` integer DEFAULT 0 NOT NULL,
	`record_id` text NOT NULL,
	`executor_id` text NOT NULL,
	`credential_owner_id` text NOT NULL,
	`note_id` text NOT NULL,
	`original_id` text NOT NULL,
	`subject` text,
	`drive_epoch` integer NOT NULL,
	`ownership_generation` integer NOT NULL,
	`fingerprint` text NOT NULL,
	`llm_job_id` text,
	`preview_id` text,
	`machine_request_id` text,
	`cancel_generation` integer NOT NULL,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`deletion_id`) REFERENCES `account_deletions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`record_id`) REFERENCES `drive_backup_records`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`executor_id`) REFERENCES `accounts`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`original_id`) REFERENCES `originals`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`llm_job_id`,`id`) REFERENCES `llm_conversions`(`job_id`,`source_binding_id`) ON UPDATE no action ON DELETE no action DEFERRABLE INITIALLY DEFERRED,
	FOREIGN KEY (`preview_id`,`id`) REFERENCES `llm_pdf_previews`(`id`,`source_binding_id`) ON UPDATE no action ON DELETE no action DEFERRABLE INITIALLY DEFERRED,
	FOREIGN KEY (`machine_request_id`,`id`) REFERENCES `machine_regenerations`(`id`,`source_binding_id`) ON UPDATE no action ON DELETE no action DEFERRABLE INITIALLY DEFERRED,
	CONSTRAINT "regeneration_binding_retention" CHECK(("__new_regeneration_source_bindings"."retention"='usable' and "__new_regeneration_source_bindings"."subject" is not null and "__new_regeneration_source_bindings"."deletion_id" is null and "__new_regeneration_source_bindings"."redaction_version"=0) or ("__new_regeneration_source_bindings"."retention"='recorder-deleted' and "__new_regeneration_source_bindings"."subject" is null and "__new_regeneration_source_bindings"."deletion_id" is not null and "__new_regeneration_source_bindings"."redaction_version"=1)),
	CONSTRAINT "regeneration_source_bindings_shape_1" CHECK(drive_epoch>0),
	CONSTRAINT "regeneration_source_bindings_shape_2" CHECK(ownership_generation>0),
	CONSTRAINT "regeneration_source_bindings_shape_3" CHECK(length(fingerprint)=64),
	CONSTRAINT "regeneration_source_bindings_shape_4" CHECK(cancel_generation>=0),
	CONSTRAINT "regeneration_source_bindings_shape_5" CHECK(version>0),
	CONSTRAINT "regeneration_source_bindings_shape_6" CHECK((llm_job_id IS NOT NULL)+(preview_id IS NOT NULL)+(machine_request_id IS NOT NULL)=1)
);

--> statement-breakpoint
INSERT INTO `__new_regeneration_source_bindings`("id", "retention", "deletion_id", "redaction_version", "record_id", "executor_id", "credential_owner_id", "note_id", "original_id", "subject", "drive_epoch", "ownership_generation", "fingerprint", "llm_job_id", "preview_id", "machine_request_id", "cancel_generation", "version", "created_at") SELECT "id", 'usable', NULL, 0, "record_id", "executor_id", "credential_owner_id", "note_id", "original_id", "subject", "drive_epoch", "ownership_generation", "fingerprint", "llm_job_id", "preview_id", "machine_request_id", "cancel_generation", "version", "created_at" FROM `regeneration_source_bindings`;
--> statement-breakpoint
DROP TABLE `regeneration_source_bindings`;
--> statement-breakpoint
ALTER TABLE `__new_regeneration_source_bindings` RENAME TO `regeneration_source_bindings`;
--> statement-breakpoint
CREATE UNIQUE INDEX `regeneration_binding_llm` ON `regeneration_source_bindings` (`llm_job_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `regeneration_binding_preview` ON `regeneration_source_bindings` (`preview_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `regeneration_binding_machine` ON `regeneration_source_bindings` (`machine_request_id`);
--> statement-breakpoint
CREATE INDEX `regeneration_binding_note` ON `regeneration_source_bindings` (`note_id`);
--> statement-breakpoint
CREATE TABLE `__new_drive_backup_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`retention` text DEFAULT 'usable' NOT NULL,
	`deletion_id` text,
	`redaction_version` integer DEFAULT 0 NOT NULL,
	`request_id` text NOT NULL,
	`account_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`attempt` integer NOT NULL,
	`retry_of` text,
	`note_id` text,
	`target_id` text,
	`title` text NOT NULL,
	`version` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`terminal_at` integer,
	`state` text NOT NULL,
	`bytes` integer NOT NULL,
	`failure` text,
	`record_id` text,
	`admission_identity` text,
	`root_ordinal` integer,
	FOREIGN KEY (`deletion_id`) REFERENCES `account_deletions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`request_id`) REFERENCES `drive_backup_requests`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`note_id`) REFERENCES `notes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`target_id`) REFERENCES `drive_backup_targets`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "drive_backup_job_retention" CHECK(("__new_drive_backup_jobs"."retention"='usable' and "__new_drive_backup_jobs"."deletion_id" is null and "__new_drive_backup_jobs"."redaction_version"=0) or ("__new_drive_backup_jobs"."retention"='recorder-deleted' and "__new_drive_backup_jobs"."deletion_id" is not null and "__new_drive_backup_jobs"."redaction_version"=1 and "__new_drive_backup_jobs"."terminal_at" is not null and "__new_drive_backup_jobs"."admission_identity" is null)),
	CONSTRAINT "drive_backup_job_admission" CHECK(("__new_drive_backup_jobs"."root_ordinal" is null or "__new_drive_backup_jobs"."root_ordinal" between 0 and 499) and ("__new_drive_backup_jobs"."admission_identity" is null or (json_valid("__new_drive_backup_jobs"."admission_identity") and "__new_drive_backup_jobs"."target_id" is not null and json_extract("__new_drive_backup_jobs"."admission_identity",'$.noteId')="__new_drive_backup_jobs"."note_id" and json_extract("__new_drive_backup_jobs"."admission_identity",'$.accountId')="__new_drive_backup_jobs"."account_id"))),
	CONSTRAINT "drive_backup_job_shape" CHECK("__new_drive_backup_jobs"."version" between 1 and 9007199254740991 and "__new_drive_backup_jobs"."attempt" between 1 and 9007199254740991 and "__new_drive_backup_jobs"."ordinal" between 0 and 499 and "__new_drive_backup_jobs"."bytes" between 0 and 209715200 and "__new_drive_backup_jobs"."updated_at" >= "__new_drive_backup_jobs"."created_at" and (("__new_drive_backup_jobs"."state" in ('queued','running') and "__new_drive_backup_jobs"."terminal_at" is null and "__new_drive_backup_jobs"."failure" is null and "__new_drive_backup_jobs"."record_id" is null) or ("__new_drive_backup_jobs"."state"='succeeded' and "__new_drive_backup_jobs"."terminal_at" is not null and "__new_drive_backup_jobs"."failure" is null and "__new_drive_backup_jobs"."record_id" is not null) or ("__new_drive_backup_jobs"."state"='failed' and "__new_drive_backup_jobs"."terminal_at" is not null and "__new_drive_backup_jobs"."failure" is not null and "__new_drive_backup_jobs"."record_id" is null) or ("__new_drive_backup_jobs"."state"='cancelled' and "__new_drive_backup_jobs"."terminal_at" is not null and "__new_drive_backup_jobs"."failure" is null and "__new_drive_backup_jobs"."record_id" is null)))
);

--> statement-breakpoint
INSERT INTO `__new_drive_backup_jobs`("id", "retention", "deletion_id", "redaction_version", "request_id", "account_id", "ordinal", "attempt", "retry_of", "note_id", "target_id", "title", "version", "created_at", "updated_at", "terminal_at", "state", "bytes", "failure", "record_id", "admission_identity", "root_ordinal") SELECT "id", 'usable', NULL, 0, "request_id", "account_id", "ordinal", "attempt", "retry_of", "note_id", "target_id", "title", "version", "created_at", "updated_at", "terminal_at", "state", "bytes", "failure", "record_id", "admission_identity", "root_ordinal" FROM `drive_backup_jobs`;
--> statement-breakpoint
DROP TABLE `drive_backup_jobs`;
--> statement-breakpoint
ALTER TABLE `__new_drive_backup_jobs` RENAME TO `drive_backup_jobs`;
--> statement-breakpoint
CREATE UNIQUE INDEX `drive_backup_job_attempt` ON `drive_backup_jobs` (`request_id`,`ordinal`,`attempt`);
--> statement-breakpoint
CREATE INDEX `drive_backup_job_history` ON `drive_backup_jobs` (`account_id`,`created_at`,`id`);
--> statement-breakpoint
CREATE INDEX `drive_backup_job_note` ON `drive_backup_jobs` (`note_id`,`state`);
--> statement-breakpoint
CREATE UNIQUE INDEX `drive_backup_job_live_target` ON `drive_backup_jobs` (`target_id`) WHERE "drive_backup_jobs"."terminal_at" is null;
--> statement-breakpoint
CREATE UNIQUE INDEX `drive_backup_job_root_ordinal` ON `drive_backup_jobs` (`request_id`,`root_ordinal`) WHERE "drive_backup_jobs"."root_ordinal" is not null;
--> statement-breakpoint
INSERT INTO account_deletion_credential_origins(provider,account_id,mode,use_id,credential_epoch) SELECT 'google',account_id,'legacy-unproven',NULL,NULL FROM google_identities;
--> statement-breakpoint
INSERT INTO account_deletion_credential_origins(provider,account_id,mode,use_id,credential_epoch) SELECT 'openrouter',account_id,'legacy-unproven',NULL,NULL FROM openrouter_connections WHERE credential_envelope IS NOT NULL OR provider_user_id IS NOT NULL OR ever_linked_at IS NOT NULL;
--> statement-breakpoint
CREATE TRIGGER projection_search_insert AFTER INSERT ON note_projections BEGIN INSERT INTO note_search(rowid,tokens) VALUES(new.id,new.tokens); END;
--> statement-breakpoint
CREATE TRIGGER projection_search_delete AFTER DELETE ON note_projections BEGIN INSERT INTO note_search(note_search,rowid,tokens) VALUES('delete',old.id,old.tokens); END;
--> statement-breakpoint
CREATE TRIGGER projection_search_update AFTER UPDATE OF tokens ON note_projections BEGIN INSERT INTO note_search(note_search,rowid,tokens) VALUES('delete',old.id,old.tokens); INSERT INTO note_search(rowid,tokens) VALUES(new.id,new.tokens); END;
--> statement-breakpoint
CREATE TRIGGER projection_control_version AFTER UPDATE OF version ON notes WHEN old.html=new.html AND old.title=new.title BEGIN UPDATE note_projections SET note_version=new.version WHERE note_id=new.id AND note_version=old.version; END;
--> statement-breakpoint
CREATE TRIGGER tags_revision_insert_guard BEFORE INSERT ON tags
WHEN typeof(NEW.mutation_revision) != 'integer' OR NEW.mutation_revision < 1 OR NEW.mutation_revision > 9007199254740991
BEGIN SELECT RAISE(ABORT, 'TAG_REVISION_OVERFLOW'); END;
--> statement-breakpoint
CREATE TRIGGER tags_revision_update_guard BEFORE UPDATE OF mutation_revision ON tags
WHEN typeof(NEW.mutation_revision) != 'integer' OR NEW.mutation_revision < 1 OR NEW.mutation_revision > 9007199254740991
BEGIN SELECT RAISE(ABORT, 'TAG_REVISION_OVERFLOW'); END;
--> statement-breakpoint
CREATE TRIGGER note_tags_revision_insert AFTER INSERT ON note_tags
BEGIN UPDATE tags SET mutation_revision = mutation_revision + 1 WHERE id = NEW.tag_id; END;
--> statement-breakpoint
CREATE TRIGGER note_tags_revision_delete AFTER DELETE ON note_tags
BEGIN UPDATE tags SET mutation_revision = mutation_revision + 1 WHERE id = OLD.tag_id; END;
--> statement-breakpoint
CREATE TRIGGER note_tags_revision_update AFTER UPDATE OF note_id, tag_id ON note_tags
WHEN OLD.note_id IS NOT NEW.note_id OR OLD.tag_id IS NOT NEW.tag_id
BEGIN UPDATE tags SET mutation_revision = mutation_revision + 1 WHERE id IN (OLD.tag_id, NEW.tag_id); END;
--> statement-breakpoint
CREATE TRIGGER tags_meaning_revision AFTER UPDATE OF name, normalized_key, meaning_version ON tags
WHEN OLD.name IS NOT NEW.name OR OLD.normalized_key IS NOT NEW.normalized_key OR OLD.meaning_version IS NOT NEW.meaning_version
BEGIN UPDATE tags SET mutation_revision = mutation_revision + 1 WHERE id = NEW.id; END;
--> statement-breakpoint
CREATE TRIGGER notes_lifecycle_tag_revision AFTER UPDATE OF lifecycle ON notes
WHEN OLD.lifecycle IS NOT NEW.lifecycle
BEGIN UPDATE tags SET mutation_revision = mutation_revision + 1 WHERE id IN (SELECT tag_id FROM note_tags WHERE note_id = NEW.id); END;
--> statement-breakpoint
CREATE TRIGGER notes_ownership_generation_insert_guard BEFORE INSERT ON notes
WHEN typeof(NEW.ownership_generation)!='integer' OR NEW.ownership_generation<1 OR NEW.ownership_generation>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER notes_ownership_generation_update_guard BEFORE UPDATE OF ownership_generation ON notes
WHEN typeof(NEW.ownership_generation)!='integer' OR NEW.ownership_generation<1 OR NEW.ownership_generation>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER notes_resource_revision_insert_guard BEFORE INSERT ON notes
WHEN typeof(NEW.resource_revision)!='integer' OR NEW.resource_revision<1 OR NEW.resource_revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER notes_resource_revision_update_guard BEFORE UPDATE OF resource_revision ON notes
WHEN typeof(NEW.resource_revision)!='integer' OR NEW.resource_revision<1 OR NEW.resource_revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER workspaces_membership_revision_insert_guard BEFORE INSERT ON workspaces
WHEN typeof(NEW.membership_revision)!='integer' OR NEW.membership_revision<1 OR NEW.membership_revision>9007199254740991
BEGIN SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW'); END;
--> statement-breakpoint
CREATE TRIGGER workspaces_membership_revision_update_guard BEFORE UPDATE OF membership_revision ON workspaces
WHEN typeof(NEW.membership_revision)!='integer' OR NEW.membership_revision<1 OR NEW.membership_revision>9007199254740991
BEGIN SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW'); END;
--> statement-breakpoint
CREATE TRIGGER source_bundles_content_revision_insert_guard BEFORE INSERT ON source_bundles
WHEN typeof(NEW.content_revision)!='integer' OR NEW.content_revision<1 OR NEW.content_revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER source_bundles_content_revision_update_guard BEFORE UPDATE OF content_revision ON source_bundles
WHEN typeof(NEW.content_revision)!='integer' OR NEW.content_revision<1 OR NEW.content_revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER bundle_scope_holdings_revision_insert_guard BEFORE INSERT ON bundle_scope_holdings
WHEN typeof(NEW.revision)!='integer' OR NEW.revision<1 OR NEW.revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER bundle_scope_holdings_revision_update_guard BEFORE UPDATE OF revision ON bundle_scope_holdings
WHEN typeof(NEW.revision)!='integer' OR NEW.revision<1 OR NEW.revision>9007199254740991
BEGIN
 SELECT RAISE(ABORT,'OWNERSHIP_REVISION_OVERFLOW');
END;
--> statement-breakpoint
CREATE TRIGGER write_ownership_insert_guard BEFORE INSERT ON object_writes
WHEN NOT ((NEW.note_id IS NULL AND NEW.ownership_generation IS NULL) OR (NEW.note_id IS NOT NULL AND typeof(NEW.ownership_generation)='integer' AND NEW.ownership_generation BETWEEN 1 AND 9007199254740991))
BEGIN
 SELECT RAISE(ABORT,'WRITE_OWNERSHIP_INVALID');
END;
--> statement-breakpoint
CREATE TRIGGER write_ownership_update_guard BEFORE UPDATE OF note_id,ownership_generation ON object_writes
WHEN NOT ((NEW.note_id IS NULL AND NEW.ownership_generation IS NULL) OR (NEW.note_id IS NOT NULL AND typeof(NEW.ownership_generation)='integer' AND NEW.ownership_generation BETWEEN 1 AND 9007199254740991))
BEGIN
 SELECT RAISE(ABORT,'WRITE_OWNERSHIP_INVALID');
END;
--> statement-breakpoint
CREATE TRIGGER draft_rebind_guard BEFORE UPDATE OF note_id ON media_drafts
WHEN OLD.note_id IS NOT NULL AND OLD.note_id IS NOT NEW.note_id
BEGIN
 SELECT RAISE(ABORT,'DRAFT_ALREADY_BOUND');
END;
--> statement-breakpoint
CREATE TRIGGER write_first_bind AFTER UPDATE OF note_id ON media_drafts
WHEN OLD.note_id IS NULL AND NEW.note_id IS NOT NULL
BEGIN
 UPDATE object_writes SET note_id=NEW.note_id,ownership_generation=(SELECT ownership_generation FROM notes WHERE id=NEW.note_id) WHERE kind='media-upload' AND owner_id IN (SELECT id FROM media_uploads WHERE draft_id=NEW.id) AND note_id IS NULL AND ownership_generation IS NULL;
END;
--> statement-breakpoint
CREATE TRIGGER reference_job_ownership AFTER INSERT ON reference_jobs
BEGIN
 UPDATE reference_jobs SET ownership_generation=(SELECT ownership_generation FROM notes WHERE id=NEW.note_id) WHERE id=NEW.id;
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_originals_insert AFTER INSERT ON originals
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_originals_delete AFTER DELETE ON originals
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_originals_update AFTER UPDATE OF bytes,storage_key,note_id ON originals
WHEN OLD.bytes IS NOT NEW.bytes OR OLD.storage_key IS NOT NEW.storage_key OR OLD.note_id IS NOT NEW.note_id
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id,NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_assets_insert AFTER INSERT ON assets
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (coalesce(NEW.source_note_id,(SELECT note_id FROM media_drafts WHERE id=NEW.draft_id)));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_assets_delete AFTER DELETE ON assets
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (coalesce(OLD.source_note_id,(SELECT note_id FROM media_drafts WHERE id=OLD.draft_id)));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_assets_update AFTER UPDATE OF bytes,storage_key,draft_id,source_note_id,state,unreferenced_at,committed_to_note ON assets
WHEN OLD.bytes IS NOT NEW.bytes OR OLD.storage_key IS NOT NEW.storage_key OR OLD.draft_id IS NOT NEW.draft_id OR OLD.source_note_id IS NOT NEW.source_note_id OR OLD.state IS NOT NEW.state OR OLD.unreferenced_at IS NOT NEW.unreferenced_at OR OLD.committed_to_note IS NOT NEW.committed_to_note
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (coalesce(OLD.source_note_id,(SELECT note_id FROM media_drafts WHERE id=OLD.draft_id)),coalesce(NEW.source_note_id,(SELECT note_id FROM media_drafts WHERE id=NEW.draft_id)));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_media_uploads_insert AFTER INSERT ON media_uploads
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN ((SELECT note_id FROM media_drafts WHERE id=NEW.draft_id));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_media_uploads_delete AFTER DELETE ON media_uploads
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN ((SELECT note_id FROM media_drafts WHERE id=OLD.draft_id));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_media_uploads_update AFTER UPDATE OF bytes,draft_id,state,expires_at,storage_cleaned ON media_uploads
WHEN OLD.bytes IS NOT NEW.bytes OR OLD.draft_id IS NOT NEW.draft_id OR OLD.state IS NOT NEW.state OR OLD.expires_at IS NOT NEW.expires_at OR OLD.storage_cleaned IS NOT NEW.storage_cleaned
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN ((SELECT note_id FROM media_drafts WHERE id=OLD.draft_id),(SELECT note_id FROM media_drafts WHERE id=NEW.draft_id));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_reference_objects_insert AFTER INSERT ON reference_objects
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN ((SELECT note_id FROM reference_jobs WHERE id=NEW.job_id));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_reference_objects_delete AFTER DELETE ON reference_objects
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN ((SELECT note_id FROM reference_jobs WHERE id=OLD.job_id));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_reference_objects_update AFTER UPDATE OF bytes,job_id,state ON reference_objects
WHEN OLD.bytes IS NOT NEW.bytes OR OLD.job_id IS NOT NEW.job_id OR OLD.state IS NOT NEW.state
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN ((SELECT note_id FROM reference_jobs WHERE id=OLD.job_id),(SELECT note_id FROM reference_jobs WHERE id=NEW.job_id));
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_note_asset_references_insert AFTER INSERT ON note_asset_references
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_note_asset_references_delete AFTER DELETE ON note_asset_references
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_note_asset_references_update AFTER UPDATE OF note_id,asset_id,version ON note_asset_references
WHEN OLD.note_id IS NOT NEW.note_id OR OLD.asset_id IS NOT NEW.asset_id OR OLD.version IS NOT NEW.version
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id,NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_reference_settings_insert AFTER INSERT ON reference_settings
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_reference_settings_delete AFTER DELETE ON reference_settings
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_reference_settings_update AFTER UPDATE OF note_id,bundle_id ON reference_settings
WHEN OLD.note_id IS NOT NEW.note_id OR OLD.bundle_id IS NOT NEW.bundle_id
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id,NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER move_resource_bind AFTER UPDATE OF note_id ON media_drafts
WHEN OLD.note_id IS NOT NEW.note_id
BEGIN
 UPDATE notes SET resource_revision=resource_revision+1 WHERE id IN (OLD.note_id,NEW.note_id);
END;
--> statement-breakpoint
CREATE TRIGGER holding_counts_revision AFTER UPDATE OF note_holds,admission_holds,cleanup_holds ON bundle_scope_holdings
WHEN OLD.note_holds IS NOT NEW.note_holds OR OLD.admission_holds IS NOT NEW.admission_holds OR OLD.cleanup_holds IS NOT NEW.cleanup_holds
BEGIN
 UPDATE bundle_scope_holdings SET revision=revision+1 WHERE bundle_id=NEW.bundle_id AND scope_kind=NEW.scope_kind AND scope_id=NEW.scope_id;
END;
--> statement-breakpoint
CREATE TRIGGER holding_values_insert BEFORE INSERT ON bundle_scope_holdings
WHEN NEW.scope_kind NOT IN ('personal','workspace') OR length(NEW.scope_id)=0 OR typeof(NEW.note_holds)!='integer' OR typeof(NEW.admission_holds)!='integer' OR typeof(NEW.cleanup_holds)!='integer' OR NEW.note_holds<0 OR NEW.admission_holds<0 OR NEW.cleanup_holds NOT IN (0,1)
BEGIN
 SELECT RAISE(ABORT,'HOLDING_INVALID');
END;
--> statement-breakpoint
CREATE TRIGGER holding_values_update BEFORE UPDATE OF note_holds,admission_holds,cleanup_holds,scope_kind,scope_id ON bundle_scope_holdings
WHEN NEW.scope_kind NOT IN ('personal','workspace') OR length(NEW.scope_id)=0 OR typeof(NEW.note_holds)!='integer' OR typeof(NEW.admission_holds)!='integer' OR typeof(NEW.cleanup_holds)!='integer' OR NEW.note_holds<0 OR NEW.admission_holds<0 OR NEW.cleanup_holds NOT IN (0,1)
BEGIN
 SELECT RAISE(ABORT,'HOLDING_INVALID');
END;
--> statement-breakpoint
CREATE TRIGGER holding_source_bundles_insert AFTER INSERT ON source_bundles
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_source_bundles_update AFTER UPDATE OF sealed ON source_bundles
WHEN OLD.sealed IS NOT NEW.sealed
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.id;


 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_upload_reservations_insert AFTER INSERT ON upload_reservations
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.batch_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.batch_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.batch_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.batch_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_upload_reservations_delete AFTER DELETE ON upload_reservations
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.batch_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.batch_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.batch_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.batch_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_upload_reservations_update AFTER UPDATE OF state,batch_id ON upload_reservations
WHEN OLD.state IS NOT NEW.state OR OLD.batch_id IS NOT NEW.batch_id
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.batch_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.batch_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.batch_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.batch_id;


 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.batch_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.batch_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.batch_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.batch_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_reference_settings_insert AFTER INSERT ON reference_settings
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.bundle_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_reference_settings_delete AFTER DELETE ON reference_settings
BEGIN
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
    SELECT OLD.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id),1 FROM notes n WHERE n.id=OLD.note_id AND OLD.bundle_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=OLD.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=OLD.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=OLD.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=OLD.bundle_id)
    ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.bundle_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_reference_settings_update AFTER UPDATE OF bundle_id,note_id ON reference_settings
WHEN OLD.bundle_id IS NOT NEW.bundle_id OR OLD.note_id IS NOT NEW.note_id
BEGIN
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
    SELECT OLD.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id),1 FROM notes n WHERE n.id=OLD.note_id AND OLD.bundle_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=OLD.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=OLD.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=OLD.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=OLD.bundle_id)
    ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.bundle_id;


 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.bundle_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_companion_sources_insert AFTER INSERT ON companion_sources
BEGIN
 UPDATE source_bundles SET content_revision=content_revision+1 WHERE id IN (NEW.bundle_id);

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.bundle_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_companion_sources_delete AFTER DELETE ON companion_sources
BEGIN
 UPDATE source_bundles SET content_revision=content_revision+1 WHERE id IN (OLD.bundle_id);

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.bundle_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_companion_sources_update AFTER UPDATE OF bundle_id,bytes,storage_key ON companion_sources
WHEN OLD.bundle_id IS NOT NEW.bundle_id OR OLD.bytes IS NOT NEW.bytes OR OLD.storage_key IS NOT NEW.storage_key
BEGIN
 UPDATE source_bundles SET content_revision=content_revision+1 WHERE id IN (OLD.bundle_id,NEW.bundle_id);

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=OLD.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=OLD.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=OLD.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=OLD.bundle_id;


 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=NEW.bundle_id GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=NEW.bundle_id AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=NEW.bundle_id AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=NEW.bundle_id;

END;
--> statement-breakpoint
CREATE TRIGGER holding_note_move AFTER UPDATE OF owner_account_id,owner_workspace_id ON notes
WHEN OLD.owner_account_id IS NOT NEW.owner_account_id OR OLD.owner_workspace_id IS NOT NEW.owner_workspace_id
BEGIN

 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=(SELECT bundle_id FROM reference_settings WHERE note_id=NEW.id) GROUP BY s.bundle_id,case when n.owner_workspace_id is null then 'personal' else 'workspace' end,coalesce(n.owner_workspace_id,n.owner_account_id)
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id) FROM source_bundles b WHERE b.id=(SELECT bundle_id FROM reference_settings WHERE note_id=NEW.id) AND ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading')))
 ON CONFLICT DO NOTHING;
 INSERT INTO bundle_scope_holdings(bundle_id,scope_kind,scope_id,cleanup_holds)
 SELECT b.id,case when b.workspace_id is null then 'personal' else 'workspace' end,coalesce(b.workspace_id,b.account_id),1 FROM source_bundles b WHERE b.id=(SELECT bundle_id FROM reference_settings WHERE note_id=NEW.id) AND NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=b.id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=b.id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=b.id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=b.id) AND NOT EXISTS(SELECT 1 FROM bundle_scope_holdings h WHERE h.bundle_id=b.id AND h.cleanup_holds>0)
 ON CONFLICT(bundle_id,scope_kind,scope_id) DO UPDATE SET cleanup_holds=1;
 UPDATE bundle_scope_holdings SET
 note_holds=(SELECT count(*) FROM reference_settings s JOIN notes n ON n.id=s.note_id WHERE s.bundle_id=bundle_scope_holdings.bundle_id AND case when n.owner_workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(n.owner_workspace_id,n.owner_account_id)=bundle_scope_holdings.scope_id),
 admission_holds=coalesce((SELECT (CASE WHEN b.sealed=0 THEN 1 ELSE 0 END)+(SELECT count(*) FROM upload_reservations u WHERE u.batch_id=b.id AND u.state IN ('awaiting','uploading')) FROM source_bundles b WHERE b.id=bundle_scope_holdings.bundle_id AND case when b.workspace_id is null then 'personal' else 'workspace' end=bundle_scope_holdings.scope_kind AND coalesce(b.workspace_id,b.account_id)=bundle_scope_holdings.scope_id),0),
 cleanup_holds=CASE WHEN NOT EXISTS(SELECT 1 FROM reference_settings WHERE bundle_id=bundle_scope_holdings.bundle_id) AND NOT ((SELECT sealed FROM source_bundles WHERE id=bundle_scope_holdings.bundle_id)=0 OR EXISTS(SELECT 1 FROM upload_reservations WHERE batch_id=bundle_scope_holdings.bundle_id AND state IN ('awaiting','uploading'))) AND EXISTS(SELECT 1 FROM companion_sources WHERE bundle_id=bundle_scope_holdings.bundle_id) THEN cleanup_holds ELSE 0 END
 WHERE bundle_id=(SELECT bundle_id FROM reference_settings WHERE note_id=NEW.id);

END;
--> statement-breakpoint
CREATE TRIGGER batch_header_insert_guard BEFORE INSERT ON note_batches
WHEN NEW.total<1 OR NEW.total>500 OR NEW.excluded<0 OR NEW.total+NEW.excluded>500 OR NEW.generation<1 OR NEW.generation>9007199254740991 OR NEW.last_sequence<0 OR NEW.last_sequence>500 OR NEW.pruned_through<0 OR NEW.pruned_through>NEW.last_sequence
BEGIN SELECT RAISE(ABORT,'invalid batch header'); END;
--> statement-breakpoint
CREATE TRIGGER batch_header_update_guard BEFORE UPDATE ON note_batches
WHEN NEW.total!=OLD.total OR NEW.excluded!=OLD.excluded OR NEW.actor_id!=OLD.actor_id OR NEW.request_id!=OLD.request_id OR NEW.digest!=OLD.digest OR NEW.source!=OLD.source OR NEW.operation!=OLD.operation OR (OLD.binding IS NOT NULL AND NEW.binding IS NOT OLD.binding) OR NEW.generation<OLD.generation OR NEW.generation>9007199254740991 OR NEW.last_sequence<OLD.last_sequence OR NEW.last_sequence>500 OR NEW.pruned_through<OLD.pruned_through OR NEW.pruned_through>NEW.last_sequence
BEGIN SELECT RAISE(ABORT,'invalid batch update'); END;
--> statement-breakpoint
CREATE TRIGGER batch_attempt_number_guard BEFORE INSERT ON note_batch_attempts
WHEN NEW.attempt_number<1 OR NEW.attempt_number>9007199254740991
BEGIN SELECT RAISE(ABORT,'invalid batch attempt number'); END;
--> statement-breakpoint
CREATE TRIGGER batch_attempt_number_update_guard BEFORE UPDATE ON note_batch_attempts
WHEN NEW.attempt_number!=OLD.attempt_number
BEGIN SELECT RAISE(ABORT,'invalid batch attempt number update'); END;
--> statement-breakpoint
CREATE TRIGGER batch_attempt_insert_guard BEFORE INSERT ON note_batch_attempts
WHEN NEW.ordinal<0 OR NEW.ordinal>=500 OR NEW.generation<1 OR NEW.generation>9007199254740991 OR NEW.base_sequence<0 OR NEW.base_sequence>500 OR NEW.state NOT IN ('queued','running','succeeded','failed','cancelled') OR (NEW.state='running')!=(NEW.lease_token IS NOT NULL AND NEW.lease_until IS NOT NULL) OR (NEW.state='succeeded')!=(NEW.result IS NOT NULL) OR (NEW.state='failed')!=(NEW.failure IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'invalid batch attempt'); END;
--> statement-breakpoint
CREATE TRIGGER batch_attempt_update_guard BEFORE UPDATE ON note_batch_attempts
WHEN NEW.parent_id!=OLD.parent_id OR NEW.ordinal!=OLD.ordinal OR NEW.note_id!=OLD.note_id OR NEW.generation!=OLD.generation OR NEW.retry_of IS NOT OLD.retry_of OR NEW.expected IS NOT OLD.expected OR NEW.base_sequence!=OLD.base_sequence OR (OLD.state IN ('succeeded','failed','cancelled') AND NEW.state!=OLD.state) OR NEW.state NOT IN ('queued','running','succeeded','failed','cancelled') OR (NEW.state='running')!=(NEW.lease_token IS NOT NULL AND NEW.lease_until IS NOT NULL) OR (NEW.state='succeeded')!=(NEW.result IS NOT NULL) OR (NEW.state='failed')!=(NEW.failure IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'invalid batch attempt update'); END;
--> statement-breakpoint
CREATE TRIGGER batch_receipt_insert_guard BEFORE INSERT ON note_batch_move_receipts
WHEN NEW.sequence<1 OR NEW.sequence>500 OR NOT EXISTS(SELECT 1 FROM note_batches WHERE id=NEW.parent_id AND last_sequence=NEW.sequence)
BEGIN SELECT RAISE(ABORT,'invalid batch receipt'); END;
--> statement-breakpoint
CREATE TRIGGER membership_revision_insert AFTER INSERT ON workspace_members
BEGIN UPDATE workspaces SET membership_revision=membership_revision+1 WHERE id IN (NEW.workspace_id); END;
--> statement-breakpoint
CREATE TRIGGER membership_revision_delete AFTER DELETE ON workspace_members
BEGIN UPDATE workspaces SET membership_revision=membership_revision+1 WHERE id IN (OLD.workspace_id); END;
--> statement-breakpoint
CREATE TRIGGER membership_revision_update AFTER UPDATE OF role,workspace_id,account_id ON workspace_members
WHEN OLD.role IS NOT NEW.role OR OLD.workspace_id IS NOT NEW.workspace_id OR OLD.account_id IS NOT NEW.account_id
BEGIN UPDATE workspaces SET membership_revision=membership_revision+1 WHERE id IN (OLD.workspace_id,NEW.workspace_id); END;
--> statement-breakpoint
CREATE TRIGGER note_sharing_initialize AFTER INSERT ON notes BEGIN
  INSERT INTO note_sharing(note_id) VALUES (NEW.id);
END;
--> statement-breakpoint
CREATE TRIGGER note_sharing_required BEFORE DELETE ON note_sharing
WHEN EXISTS(SELECT 1 FROM notes WHERE id=OLD.note_id) BEGIN
  SELECT RAISE(ABORT, 'note_sharing_required');
END;
--> statement-breakpoint
CREATE TRIGGER note_public_identity_required_insert BEFORE INSERT ON note_sharing
WHEN NEW.visibility='public' AND NOT EXISTS(SELECT 1 FROM note_public_identities WHERE note_id=NEW.note_id)
BEGIN SELECT RAISE(ABORT,'Public note identity required'); END;
--> statement-breakpoint
CREATE TRIGGER note_public_identity_required_update BEFORE UPDATE OF visibility,note_id ON note_sharing
WHEN NEW.visibility='public' AND NOT EXISTS(SELECT 1 FROM note_public_identities WHERE note_id=NEW.note_id)
BEGIN SELECT RAISE(ABORT,'Public note identity required'); END;
--> statement-breakpoint
CREATE TRIGGER note_public_identity_preserve BEFORE DELETE ON note_public_identities
WHEN EXISTS(SELECT 1 FROM notes WHERE id=OLD.note_id)
BEGIN SELECT RAISE(ABORT,'Public note identity is permanent'); END;
--> statement-breakpoint
CREATE TRIGGER note_public_identity_immutable BEFORE UPDATE ON note_public_identities
WHEN NEW.note_id!=OLD.note_id OR NEW.public_id!=OLD.public_id OR NEW.url_generation!=OLD.url_generation OR NEW.created_at!=OLD.created_at OR NEW.access_epoch<OLD.access_epoch
BEGIN SELECT RAISE(ABORT,'Public note identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER profile_icon_pointer_insert BEFORE INSERT ON account_public_profiles
WHEN NEW.icon_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM account_profile_icons WHERE id=NEW.icon_id AND account_id=NEW.account_id AND state='ready')
BEGIN SELECT RAISE(ABORT,'Profile icon is not ready for this account'); END;
--> statement-breakpoint
CREATE TRIGGER profile_icon_pointer_update BEFORE UPDATE OF icon_id,account_id ON account_public_profiles
WHEN NEW.icon_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM account_profile_icons WHERE id=NEW.icon_id AND account_id=NEW.account_id AND state='ready')
BEGIN SELECT RAISE(ABORT,'Profile icon is not ready for this account'); END;
--> statement-breakpoint
CREATE TRIGGER profile_icon_ready_preserve BEFORE UPDATE ON account_profile_icons
WHEN EXISTS(SELECT 1 FROM account_public_profiles WHERE icon_id=OLD.id) AND (NEW.id!=OLD.id OR NEW.account_id!=OLD.account_id OR NEW.state!='ready' OR NEW.storage_key!=OLD.storage_key OR NEW.bytes!=OLD.bytes OR NEW.sha256 IS NOT OLD.sha256 OR NEW.width IS NOT OLD.width OR NEW.height IS NOT OLD.height)
BEGIN SELECT RAISE(ABORT,'Current profile icon must remain ready'); END;
--> statement-breakpoint
CREATE TRIGGER workspace_public_active_insert BEFORE INSERT ON workspace_public_settings
WHEN NEW.page_public=1 AND NOT EXISTS(SELECT 1 FROM workspaces WHERE id=NEW.workspace_id AND state='active' AND slug IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Public workspace requires an active slug'); END;
--> statement-breakpoint
CREATE TRIGGER workspace_public_active_update BEFORE UPDATE ON workspace_public_settings
WHEN NEW.page_public=1 AND NOT EXISTS(SELECT 1 FROM workspaces WHERE id=NEW.workspace_id AND state='active' AND slug IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'Public workspace requires an active slug'); END;
--> statement-breakpoint
CREATE TRIGGER workspace_public_slug_required BEFORE UPDATE OF slug ON workspaces
WHEN NEW.state='active' AND NEW.slug IS NULL AND EXISTS(SELECT 1 FROM workspace_public_settings WHERE workspace_id=NEW.id AND page_public=1)
BEGIN SELECT RAISE(ABORT,'Public workspace slug cannot be cleared'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_computation_identity_immutable BEFORE UPDATE ON pdf_computations
WHEN NEW.id!=OLD.id OR NEW.target_note_id!=OLD.target_note_id OR NEW.source_identity!=OLD.source_identity OR NEW.profile!=OLD.profile OR NEW.workspace_id!=OLD.workspace_id OR NEW.created_at!=OLD.created_at OR NEW.deadline_at!=OLD.deadline_at
BEGIN SELECT RAISE(ABORT,'PDF computation identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_computation_debt_delete BEFORE DELETE ON pdf_computations
WHEN OLD.state!='closed' OR OLD.workspace_removed!=1 OR OLD.reserved_bytes!=0
BEGIN SELECT RAISE(ABORT,'PDF workspace has not been reclaimed'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_artifact_identity_immutable BEFORE UPDATE ON pdf_artifacts
WHEN NEW.id!=OLD.id OR NEW.target_note_id!=OLD.target_note_id OR NEW.compute_id!=OLD.compute_id OR NEW.source_identity!=OLD.source_identity OR NEW.profile!=OLD.profile OR NEW.created_at!=OLD.created_at OR (OLD.published_at IS NOT NULL AND (NEW.published_at IS NOT OLD.published_at OR NEW.expires_at IS NOT OLD.expires_at)) OR (OLD.storage_key IS NOT NULL AND NEW.storage_key IS NOT NULL AND NEW.storage_key!=OLD.storage_key)
BEGIN SELECT RAISE(ABORT,'PDF artifact identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_artifact_binding_insert BEFORE INSERT ON pdf_artifacts
WHEN NOT EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=NEW.compute_id AND c.target_note_id=NEW.target_note_id AND c.source_identity=NEW.source_identity AND c.profile=NEW.profile)
BEGIN SELECT RAISE(ABORT,'PDF artifact computation mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_artifact_debt_delete BEFORE DELETE ON pdf_artifacts
WHEN OLD.state!='removed' OR OLD.storage_key IS NOT NULL OR OLD.reserved_bytes!=0
BEGIN SELECT RAISE(ABORT,'PDF artifact has not been reclaimed'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_artifact_file_insert BEFORE INSERT ON pdf_artifacts
WHEN NEW.file IS NOT NULL AND (json_valid(NEW.file)=0 OR json_type(NEW.file,'$.bytes') IS NOT 'integer' OR json_extract(NEW.file,'$.bytes')<1 OR json_extract(NEW.file,'$.bytes')>NEW.reserved_bytes OR json_type(NEW.file,'$.sha256') IS NOT 'text' OR length(json_extract(NEW.file,'$.sha256'))!=64 OR json_type(NEW.file,'$.filename') IS NOT 'text')
BEGIN SELECT RAISE(ABORT,'PDF artifact file invalid'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_artifact_file_update BEFORE UPDATE ON pdf_artifacts
WHEN NEW.file IS NOT NULL AND (json_valid(NEW.file)=0 OR json_type(NEW.file,'$.bytes') IS NOT 'integer' OR json_extract(NEW.file,'$.bytes')<1 OR json_extract(NEW.file,'$.bytes')>NEW.reserved_bytes OR json_type(NEW.file,'$.sha256') IS NOT 'text' OR length(json_extract(NEW.file,'$.sha256'))!=64 OR json_type(NEW.file,'$.filename') IS NOT 'text')
BEGIN SELECT RAISE(ABORT,'PDF artifact file invalid'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_request_identity_immutable BEFORE UPDATE ON pdf_requests
WHEN NEW.id!=OLD.id OR NEW.account_id!=OLD.account_id OR NEW.command_id!=OLD.command_id OR NEW.input_digest!=OLD.input_digest OR NEW.target_note_id!=OLD.target_note_id OR NEW.source_identity!=OLD.source_identity OR NEW.style!=OLD.style OR NEW.compute_id IS NOT OLD.compute_id OR NEW.retry_of IS NOT OLD.retry_of OR NEW.created_at!=OLD.created_at OR NEW.history_expires_at!=OLD.history_expires_at OR (OLD.state IN('succeeded','failed','cancelled') AND NEW.state!=OLD.state) OR (OLD.state='succeeded' AND NEW.artifact_id IS NOT OLD.artifact_id)
BEGIN SELECT RAISE(ABORT,'PDF request identity or terminal result is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_request_binding_insert BEFORE INSERT ON pdf_requests
WHEN (NEW.compute_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=NEW.compute_id AND c.target_note_id=NEW.target_note_id AND c.source_identity=NEW.source_identity)) OR (NEW.artifact_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=NEW.artifact_id AND a.target_note_id=NEW.target_note_id AND a.source_identity=NEW.source_identity AND a.state='ready'))
BEGIN SELECT RAISE(ABORT,'PDF request binding mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_request_result_update BEFORE UPDATE OF artifact_id ON pdf_requests
WHEN NEW.artifact_id IS NOT NULL AND NEW.artifact_id IS NOT OLD.artifact_id AND NOT EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=NEW.artifact_id AND a.target_note_id=NEW.target_note_id AND a.source_identity=NEW.source_identity AND a.state='ready')
BEGIN SELECT RAISE(ABORT,'PDF request result mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_request_unbind BEFORE UPDATE OF live_note_id ON pdf_requests
WHEN NEW.live_note_id IS NULL AND (EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=NEW.compute_id AND (c.state!='closed' OR c.workspace_removed=0)) OR EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=NEW.artifact_id AND a.state!='removed'))
BEGIN SELECT RAISE(ABORT,'PDF request still owns physical resources'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_delivery_binding_insert BEFORE INSERT ON pdf_deliveries
WHEN NOT EXISTS(SELECT 1 FROM pdf_requests r JOIN pdf_artifacts a ON a.id=r.artifact_id WHERE r.id=NEW.request_id AND r.account_id=NEW.account_id AND r.state='succeeded' AND a.id=NEW.artifact_id AND a.state='ready' AND NEW.expires_at=min(NEW.created_at+120000,a.expires_at))
BEGIN SELECT RAISE(ABORT,'PDF delivery binding mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_delivery_identity_immutable BEFORE UPDATE ON pdf_deliveries
WHEN NEW.id!=OLD.id OR NEW.request_id!=OLD.request_id OR NEW.artifact_id!=OLD.artifact_id OR NEW.account_id!=OLD.account_id OR NEW.created_at!=OLD.created_at OR NEW.expires_at!=OLD.expires_at OR (OLD.state='closed' AND NEW.state!='closed')
BEGIN SELECT RAISE(ABORT,'PDF delivery identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_delivery_active_delete BEFORE DELETE ON pdf_deliveries
WHEN OLD.state!='closed'
BEGIN SELECT RAISE(ABORT,'PDF delivery is not closed'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_identity BEFORE UPDATE ON pdf_anonymous_requests
WHEN NEW.id!=OLD.id OR NEW.browser_hash!=OLD.browser_hash OR NEW.command_id!=OLD.command_id OR NEW.input_digest!=OLD.input_digest OR NEW.target_note_id!=OLD.target_note_id OR NEW.source_identity!=OLD.source_identity OR NEW.profile!=OLD.profile OR NEW.compute_id IS NOT OLD.compute_id OR NEW.authority_kind!=OLD.authority_kind OR NEW.public_id IS NOT OLD.public_id OR NEW.url_generation IS NOT OLD.url_generation OR NEW.access_epoch IS NOT OLD.access_epoch OR NEW.token_hash IS NOT OLD.token_hash OR NEW.link_generation IS NOT OLD.link_generation OR NEW.grant_epoch IS NOT OLD.grant_epoch OR NEW.grant_verified_at IS NOT OLD.grant_verified_at OR NEW.grant_expires_at IS NOT OLD.grant_expires_at OR NEW.created_at!=OLD.created_at OR NEW.ticket_expires_at!=OLD.ticket_expires_at OR NEW.ticket_generation!=OLD.ticket_generation OR NEW.ticket_kid!=OLD.ticket_kid OR (OLD.state='invalidated' AND NEW.state!='invalidated') OR (OLD.state='expired' AND NEW.state NOT IN('expired','invalidated')) OR (OLD.state IN('succeeded','failed') AND NEW.state NOT IN(OLD.state,'expired','invalidated')) OR (OLD.artifact_id IS NOT NULL AND NEW.artifact_id IS NOT OLD.artifact_id)
BEGIN SELECT RAISE(ABORT,'Anonymous PDF request identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_binding BEFORE INSERT ON pdf_anonymous_requests
WHEN (NEW.compute_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=NEW.compute_id AND c.target_note_id=NEW.target_note_id AND c.source_identity=NEW.source_identity AND c.profile=NEW.profile)) OR (NEW.artifact_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=NEW.artifact_id AND a.target_note_id=NEW.target_note_id AND a.source_identity=NEW.source_identity AND a.profile=NEW.profile AND a.state='ready'))
BEGIN SELECT RAISE(ABORT,'Anonymous PDF binding mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_result BEFORE UPDATE OF artifact_id ON pdf_anonymous_requests
WHEN NEW.artifact_id IS NOT NULL AND NEW.artifact_id IS NOT OLD.artifact_id AND NOT EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=NEW.artifact_id AND a.target_note_id=NEW.target_note_id AND a.source_identity=NEW.source_identity AND a.profile=NEW.profile AND a.state='ready')
BEGIN SELECT RAISE(ABORT,'Anonymous PDF artifact mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_auto BEFORE UPDATE OF auto_delivery_id ON pdf_anonymous_requests
WHEN (OLD.auto_delivery_id IS NOT NULL AND NEW.auto_delivery_id IS NOT OLD.auto_delivery_id) OR (OLD.auto_delivery_id IS NULL AND NEW.auto_delivery_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM pdf_anonymous_deliveries d WHERE d.id=NEW.auto_delivery_id AND d.request_id=NEW.id AND d.artifact_id=NEW.artifact_id AND d.state='ready'))
BEGIN SELECT RAISE(ABORT,'Anonymous PDF automatic delivery already consumed'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_auto_insert BEFORE INSERT ON pdf_anonymous_requests
WHEN NEW.auto_delivery_id IS NOT NULL
BEGIN SELECT RAISE(ABORT,'Anonymous PDF automatic delivery must start unused'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_unbind BEFORE UPDATE OF live_note_id ON pdf_anonymous_requests
WHEN NEW.live_note_id IS NULL AND (EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=NEW.compute_id AND (c.state!='closed' OR c.workspace_removed=0)) OR EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=NEW.artifact_id AND a.state!='removed') OR EXISTS(SELECT 1 FROM pdf_anonymous_deliveries d WHERE d.request_id=NEW.id AND d.state!='closed'))
BEGIN SELECT RAISE(ABORT,'Anonymous PDF resources remain owned'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_request_delete BEFORE DELETE ON pdf_anonymous_requests
WHEN OLD.state IN('queued','running') OR EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=OLD.compute_id AND (c.state!='closed' OR c.workspace_removed=0)) OR EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=OLD.artifact_id AND a.state!='removed')
BEGIN SELECT RAISE(ABORT,'Anonymous PDF resources remain owned'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_delivery_binding BEFORE INSERT ON pdf_anonymous_deliveries
WHEN NOT EXISTS(SELECT 1 FROM pdf_anonymous_requests r JOIN pdf_artifacts a ON a.id=r.artifact_id WHERE r.id=NEW.request_id AND r.state='succeeded' AND a.id=NEW.artifact_id AND a.state='ready' AND NEW.expires_at=min(NEW.created_at+120000,r.ticket_expires_at,a.expires_at,coalesce(r.grant_expires_at,r.ticket_expires_at)))
BEGIN SELECT RAISE(ABORT,'Anonymous PDF delivery binding mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_delivery_identity BEFORE UPDATE ON pdf_anonymous_deliveries
WHEN NEW.id!=OLD.id OR NEW.request_id!=OLD.request_id OR NEW.artifact_id!=OLD.artifact_id OR NEW.created_at!=OLD.created_at OR NEW.expires_at!=OLD.expires_at OR (OLD.state='closed' AND NEW.state!='closed')
BEGIN SELECT RAISE(ABORT,'Anonymous PDF delivery identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_delivery_delete BEFORE DELETE ON pdf_anonymous_deliveries
WHEN OLD.state!='closed'
BEGIN SELECT RAISE(ABORT,'Anonymous PDF delivery remains active'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_delivery_close BEFORE UPDATE OF state ON pdf_anonymous_deliveries
WHEN NEW.state='closed' AND EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='pdf-anonymous-delivery' AND w.owner_id=NEW.id AND w.active=1)
BEGIN SELECT RAISE(ABORT,'Anonymous PDF reader remains active'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_delivery_shared_capacity BEFORE INSERT ON pdf_deliveries
WHEN NEW.state!='closed' AND (SELECT count(*) FROM pdf_deliveries WHERE state!='closed')+(SELECT count(*) FROM pdf_anonymous_deliveries WHERE state!='closed')>=2
BEGIN SELECT RAISE(ABORT,'PDF delivery capacity exhausted'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_anonymous_delivery_shared_capacity BEFORE INSERT ON pdf_anonymous_deliveries
WHEN NEW.state!='closed' AND (SELECT count(*) FROM pdf_deliveries WHERE state!='closed')+(SELECT count(*) FROM pdf_anonymous_deliveries WHERE state!='closed')>=2
BEGIN SELECT RAISE(ABORT,'PDF delivery capacity exhausted'); END;
--> statement-breakpoint
CREATE TRIGGER zip_request_immutable BEFORE UPDATE ON zip_requests
WHEN NEW.account_id!=OLD.account_id OR NEW.command_id!=OLD.command_id OR NEW.input_digest!=OLD.input_digest OR NEW.format!=OLD.format OR NEW.style!=OLD.style OR NEW.created_at!=OLD.created_at OR NEW.history_expires_at!=OLD.history_expires_at
BEGIN SELECT RAISE(ABORT,'zip request identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_parent BEFORE INSERT ON zip_runs
WHEN NOT EXISTS(SELECT 1 FROM zip_requests q WHERE q.id=NEW.request_id AND q.account_id=NEW.account_id AND q.generation=NEW.generation AND q.state='active')
BEGIN SELECT RAISE(ABORT,'zip run parent mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_immutable BEFORE UPDATE ON zip_runs
WHEN NEW.request_id!=OLD.request_id OR NEW.generation!=OLD.generation OR NEW.account_id!=OLD.account_id OR NEW.command_id!=OLD.command_id OR NEW.input_digest!=OLD.input_digest OR NEW.accepted_at!=OLD.accepted_at OR NEW.history_expires_at!=OLD.history_expires_at OR NEW.deadline_at!=OLD.deadline_at OR (OLD.published_at IS NOT NULL AND NEW.published_at IS NOT OLD.published_at) OR (OLD.finished_at IS NOT NULL AND NEW.finished_at IS NOT OLD.finished_at)
BEGIN SELECT RAISE(ABORT,'zip run identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_target_immutable BEFORE UPDATE ON zip_targets
WHEN NEW.request_id!=OLD.request_id OR NEW.ordinal!=OLD.ordinal OR NEW.target_note_id!=OLD.target_note_id OR NEW.latest_attempt_number<OLD.latest_attempt_number OR (OLD.live_note_id IS NULL AND NEW.live_note_id IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'zip target identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_target_live_guard BEFORE UPDATE ON zip_targets
WHEN NEW.live_note_id IS NULL AND OLD.live_note_id IS NOT NULL AND (
EXISTS(SELECT 1 FROM zip_requests q WHERE q.id=NEW.request_id AND q.state!='terminal') OR
EXISTS(SELECT 1 FROM zip_spools s JOIN zip_attempts p ON p.id=s.attempt_id WHERE p.request_id=NEW.request_id AND p.ordinal=NEW.ordinal AND s.state!='removed') OR
EXISTS(SELECT 1 FROM zip_assemblies a WHERE a.request_id=NEW.request_id AND (a.state!='closed' OR a.storage_key IS NOT NULL)) OR
EXISTS(SELECT 1 FROM zip_spool_refs f WHERE f.request_id=NEW.request_id AND f.ordinal=NEW.ordinal))
BEGIN SELECT RAISE(ABORT,'zip target still retained'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempt_immutable BEFORE UPDATE ON zip_attempts
WHEN NEW.id!=OLD.id OR NEW.request_id!=OLD.request_id OR NEW.generation!=OLD.generation OR NEW.ordinal!=OLD.ordinal OR NEW.attempt_number!=OLD.attempt_number OR NEW.created_at!=OLD.created_at OR NEW.history_expires_at!=OLD.history_expires_at OR NEW.expected_identity!=OLD.expected_identity
BEGIN SELECT RAISE(ABORT,'zip attempt identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempt_terminal BEFORE UPDATE ON zip_attempts
WHEN OLD.state IN('succeeded','failed','excluded','cancelled') AND (NEW.state!=OLD.state OR NEW.result IS NOT OLD.result OR NEW.failure IS NOT OLD.failure)
BEGIN SELECT RAISE(ABORT,'zip attempt result is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_ref_ready_insert BEFORE INSERT ON zip_spool_refs
WHEN NOT EXISTS(SELECT 1 FROM zip_spools s WHERE s.id=NEW.spool_id AND s.state='ready')
BEGIN SELECT RAISE(ABORT,'zip spool unavailable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_ref_ready_update BEFORE UPDATE ON zip_spool_refs
WHEN NOT EXISTS(SELECT 1 FROM zip_spools s WHERE s.id=NEW.spool_id AND s.state='ready') OR NEW.spool_id!=OLD.spool_id OR NEW.request_id!=OLD.request_id OR NEW.generation!=OLD.generation OR NEW.ordinal!=OLD.ordinal
BEGIN SELECT RAISE(ABORT,'zip spool reference mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spool_cleanup_guard BEFORE UPDATE ON zip_spools
WHEN NEW.state IN('cleanup','removed') AND EXISTS(SELECT 1 FROM zip_spool_refs r WHERE r.spool_id=NEW.id)
BEGIN SELECT RAISE(ABORT,'zip spool referenced'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spool_close_guard BEFORE UPDATE ON zip_spools
WHEN NEW.state IN('ready','removed') AND EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='zip-spool' AND w.owner_id=NEW.id AND w.active=1)
BEGIN SELECT RAISE(ABORT,'zip spool still owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spool_no_resurrect BEFORE UPDATE ON zip_spools
WHEN (OLD.state='removed' AND NEW.state!='removed') OR (OLD.state='cleanup' AND NEW.state NOT IN('cleanup','removed')) OR (OLD.state='ready' AND NEW.state='writing')
BEGIN SELECT RAISE(ABORT,'zip spool state regression'); END;
--> statement-breakpoint
CREATE TRIGGER zip_assembly_close_guard BEFORE UPDATE ON zip_assemblies
WHEN NEW.state='closed' AND EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='zip-assembly' AND w.owner_id=NEW.id AND w.active=1)
BEGIN SELECT RAISE(ABORT,'zip assembly still owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_assembly_immutable BEFORE UPDATE ON zip_assemblies
WHEN NEW.request_id!=OLD.request_id OR NEW.generation!=OLD.generation OR NEW.assembly_generation!=OLD.assembly_generation OR NEW.ordinals!=OLD.ordinals OR NEW.seal_digest!=OLD.seal_digest OR (OLD.state='closed' AND NEW.state!='closed')
BEGIN SELECT RAISE(ABORT,'zip assembly identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifact_assembly BEFORE INSERT ON zip_artifacts
WHEN NOT EXISTS(SELECT 1 FROM zip_assemblies a WHERE a.id=NEW.assembly_id AND a.state='closed' AND a.outcome='success' AND a.storage_key=NEW.storage_key AND a.file=NEW.file)
BEGIN SELECT RAISE(ABORT,'zip assembly not closed'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifact_immutable BEFORE UPDATE ON zip_artifacts
WHEN NEW.assembly_id!=OLD.assembly_id OR NEW.published_at!=OLD.published_at OR NEW.expires_at!=OLD.expires_at OR (OLD.state='removed' AND NEW.state!='removed') OR (OLD.state='cleanup' AND NEW.state='ready')
BEGIN SELECT RAISE(ABORT,'zip artifact identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifact_remove_guard BEFORE UPDATE ON zip_artifacts
WHEN NEW.state='removed' AND EXISTS(SELECT 1 FROM zip_deliveries d WHERE d.artifact_id=NEW.id AND d.state!='closed')
BEGIN SELECT RAISE(ABORT,'zip artifact still delivered'); END;
--> statement-breakpoint
CREATE TRIGGER zip_entry_immutable BEFORE UPDATE ON zip_artifact_entries
WHEN NEW.artifact_id!=OLD.artifact_id OR NEW.ordinal!=OLD.ordinal OR NEW.target_note_id!=OLD.target_note_id OR NEW.source_identity!=OLD.source_identity OR NEW.external_identity!=OLD.external_identity OR NEW.profile!=OLD.profile OR NEW.filename!=OLD.filename OR NEW.bytes!=OLD.bytes OR NEW.sha256!=OLD.sha256 OR (OLD.live_note_id IS NULL AND NEW.live_note_id IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'zip entry identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_entry_live_guard BEFORE UPDATE ON zip_artifact_entries
WHEN NEW.live_note_id IS NULL AND EXISTS(SELECT 1 FROM zip_artifacts a WHERE a.id=NEW.artifact_id AND a.state!='removed')
BEGIN SELECT RAISE(ABORT,'zip entry still retained'); END;
--> statement-breakpoint
CREATE TRIGGER zip_delivery_capacity BEFORE INSERT ON zip_deliveries
WHEN NEW.state!='closed' AND (SELECT count(*) FROM zip_deliveries WHERE state!='closed')>=2
BEGIN SELECT RAISE(ABORT,'zip delivery capacity'); END;
--> statement-breakpoint
CREATE TRIGGER zip_delivery_artifact BEFORE INSERT ON zip_deliveries
WHEN NEW.state!='closed' AND NOT EXISTS(SELECT 1 FROM zip_artifacts a JOIN zip_assemblies s ON s.id=a.assembly_id JOIN zip_requests q ON q.id=s.request_id WHERE a.id=NEW.artifact_id AND q.account_id=NEW.account_id AND a.state='ready' AND a.generation=NEW.artifact_generation AND NEW.expires_at<=a.expires_at)
BEGIN SELECT RAISE(ABORT,'zip delivery artifact unavailable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_delivery_immutable BEFORE UPDATE ON zip_deliveries
WHEN NEW.artifact_id!=OLD.artifact_id OR NEW.artifact_generation!=OLD.artifact_generation OR NEW.account_id!=OLD.account_id OR NEW.created_at!=OLD.created_at OR NEW.expires_at!=OLD.expires_at OR (OLD.state='closed' AND NEW.state!='closed')
BEGIN SELECT RAISE(ABORT,'zip delivery identity is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_delivery_close_guard BEFORE UPDATE ON zip_deliveries
WHEN NEW.state='closed' AND EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='zip-delivery' AND w.owner_id=NEW.id AND w.active=1)
BEGIN SELECT RAISE(ABORT,'zip delivery still owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_request_terminal_guard BEFORE UPDATE ON zip_requests
WHEN NEW.state='terminal' AND (EXISTS(SELECT 1 FROM zip_runs r WHERE r.request_id=NEW.id AND r.state IN('queued','running','assembling','stopping')) OR EXISTS(SELECT 1 FROM zip_assemblies a WHERE a.request_id=NEW.id AND a.state!='closed') OR EXISTS(SELECT 1 FROM object_writes w JOIN zip_spools s ON w.kind='zip-spool' AND w.owner_id=s.id JOIN zip_attempts a ON a.id=s.attempt_id WHERE a.request_id=NEW.id AND w.active=1))
BEGIN SELECT RAISE(ABORT,'zip request still owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_publish_guard BEFORE UPDATE ON zip_runs
WHEN NEW.artifact_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM zip_artifacts a JOIN zip_assemblies s ON s.id=a.assembly_id WHERE a.id=NEW.artifact_id AND s.request_id=NEW.request_id AND s.generation=NEW.generation AND a.published_at=NEW.published_at AND EXISTS(SELECT 1 FROM zip_artifact_entries e WHERE e.artifact_id=a.id))
BEGIN SELECT RAISE(ABORT,'zip run artifact mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER zip_requests_integer_insert BEFORE INSERT ON zip_requests
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.cancel_generation)!='integer' OR NEW.cancel_generation<0 OR NEW.cancel_generation>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.updated_at)!='integer' OR NEW.updated_at<0 OR NEW.updated_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_requests_integer_update BEFORE UPDATE ON zip_requests
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.cancel_generation)!='integer' OR NEW.cancel_generation<0 OR NEW.cancel_generation>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.updated_at)!='integer' OR NEW.updated_at<0 OR NEW.updated_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_runs_integer_insert BEFORE INSERT ON zip_runs
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.accepted_at)!='integer' OR NEW.accepted_at<0 OR NEW.accepted_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.deadline_at)!='integer' OR NEW.deadline_at<0 OR NEW.deadline_at>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_runs_integer_update BEFORE UPDATE ON zip_runs
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.accepted_at)!='integer' OR NEW.accepted_at<0 OR NEW.accepted_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.deadline_at)!='integer' OR NEW.deadline_at<0 OR NEW.deadline_at>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_targets_integer_insert BEFORE INSERT ON zip_targets
WHEN typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.latest_attempt_number)!='integer' OR NEW.latest_attempt_number<0 OR NEW.latest_attempt_number>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_targets_integer_update BEFORE UPDATE ON zip_targets
WHEN typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.latest_attempt_number)!='integer' OR NEW.latest_attempt_number<0 OR NEW.latest_attempt_number>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempts_integer_insert BEFORE INSERT ON zip_attempts
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.attempt_number)!='integer' OR NEW.attempt_number<0 OR NEW.attempt_number>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempts_integer_update BEFORE UPDATE ON zip_attempts
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.attempt_number)!='integer' OR NEW.attempt_number<0 OR NEW.attempt_number>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.history_expires_at)!='integer' OR NEW.history_expires_at<0 OR NEW.history_expires_at>9007199254740991 OR typeof(NEW.version)!='integer' OR NEW.version<0 OR NEW.version>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spools_integer_insert BEFORE INSERT ON zip_spools
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spools_integer_update BEFORE UPDATE ON zip_spools
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spool_refs_integer_insert BEFORE INSERT ON zip_spool_refs
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_spool_refs_integer_update BEFORE UPDATE ON zip_spool_refs
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_assemblies_integer_insert BEFORE INSERT ON zip_assemblies
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.assembly_generation)!='integer' OR NEW.assembly_generation<0 OR NEW.assembly_generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_assemblies_integer_update BEFORE UPDATE ON zip_assemblies
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.assembly_generation)!='integer' OR NEW.assembly_generation<0 OR NEW.assembly_generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifacts_integer_insert BEFORE INSERT ON zip_artifacts
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.published_at)!='integer' OR NEW.published_at<0 OR NEW.published_at>9007199254740991 OR typeof(NEW.expires_at)!='integer' OR NEW.expires_at<0 OR NEW.expires_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifacts_integer_update BEFORE UPDATE ON zip_artifacts
WHEN typeof(NEW.generation)!='integer' OR NEW.generation<0 OR NEW.generation>9007199254740991 OR typeof(NEW.reserved_bytes)!='integer' OR NEW.reserved_bytes<0 OR NEW.reserved_bytes>9007199254740991 OR typeof(NEW.published_at)!='integer' OR NEW.published_at<0 OR NEW.published_at>9007199254740991 OR typeof(NEW.expires_at)!='integer' OR NEW.expires_at<0 OR NEW.expires_at>9007199254740991 OR typeof(NEW.next_cleanup_at)!='integer' OR NEW.next_cleanup_at<0 OR NEW.next_cleanup_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifact_entries_integer_insert BEFORE INSERT ON zip_artifact_entries
WHEN typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.bytes)!='integer' OR NEW.bytes<0 OR NEW.bytes>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_artifact_entries_integer_update BEFORE UPDATE ON zip_artifact_entries
WHEN typeof(NEW.ordinal)!='integer' OR NEW.ordinal<0 OR NEW.ordinal>9007199254740991 OR typeof(NEW.bytes)!='integer' OR NEW.bytes<0 OR NEW.bytes>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_deliveries_integer_insert BEFORE INSERT ON zip_deliveries
WHEN typeof(NEW.artifact_generation)!='integer' OR NEW.artifact_generation<0 OR NEW.artifact_generation>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.expires_at)!='integer' OR NEW.expires_at<0 OR NEW.expires_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_deliveries_integer_update BEFORE UPDATE ON zip_deliveries
WHEN typeof(NEW.artifact_generation)!='integer' OR NEW.artifact_generation<0 OR NEW.artifact_generation>9007199254740991 OR typeof(NEW.created_at)!='integer' OR NEW.created_at<0 OR NEW.created_at>9007199254740991 OR typeof(NEW.expires_at)!='integer' OR NEW.expires_at<0 OR NEW.expires_at>9007199254740991
BEGIN SELECT RAISE(ABORT,'zip integer bounds'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_exclusions_insert BEFORE INSERT ON zip_runs
WHEN NEW.exclusions!='[]'
BEGIN SELECT RAISE(ABORT,'zip initial exclusions'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_exclusions_update BEFORE UPDATE OF exclusions ON zip_runs
WHEN NOT json_valid(NEW.exclusions) OR json_type(NEW.exclusions)!='array' OR json_array_length(NEW.exclusions)>500
 OR EXISTS(SELECT 1 FROM json_each(NEW.exclusions) e WHERE json_type(e.value) IS NOT 'object' OR (SELECT count(*) FROM json_each(e.value))!=2 OR json_type(e.value,'$.ordinal') IS NOT 'integer' OR json_type(e.value,'$.reason') IS NOT 'text' OR json_extract(e.value,'$.reason') NOT IN('ZIP_NOTE_UNAVAILABLE','ZIP_CONTENT_CHANGED','ZIP_SOURCE_CHANGED','ZIP_CANCELLED') OR NOT EXISTS(SELECT 1 FROM zip_targets t WHERE t.request_id=NEW.request_id AND t.ordinal=json_extract(e.value,'$.ordinal')))
 OR EXISTS(SELECT json_extract(value,'$.ordinal') FROM json_each(NEW.exclusions) GROUP BY json_extract(value,'$.ordinal') HAVING count(*)!=1)
 OR EXISTS(SELECT 1 FROM json_each(OLD.exclusions) old WHERE NOT EXISTS(SELECT 1 FROM json_each(NEW.exclusions) new WHERE json_extract(new.value,'$.ordinal')=json_extract(old.value,'$.ordinal') AND json_extract(new.value,'$.reason')=json_extract(old.value,'$.reason')))
BEGIN SELECT RAISE(ABORT,'zip monotonic exclusions'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_results_guard BEFORE UPDATE OF results ON zip_runs
WHEN (OLD.results IS NOT NULL AND NEW.results IS NOT OLD.results) OR (NEW.results IS NOT NULL AND (NOT json_valid(NEW.results) OR json_type(NEW.results)!='array' OR json_array_length(NEW.results)>500 OR NEW.state NOT IN('succeeded','partial','failed','cancelled')))
BEGIN SELECT RAISE(ABORT,'zip terminal results'); END;
--> statement-breakpoint
CREATE TRIGGER zip_attempt_title_scrub BEFORE UPDATE OF title ON zip_attempts
WHEN NEW.title!=OLD.title AND NEW.title!=''
BEGIN SELECT RAISE(ABORT,'zip attempt title is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_binding_insert BEFORE INSERT ON zip_attempts
WHEN NEW.pdf_compute_id IS NOT NULL OR NEW.pdf_source_identity IS NOT NULL OR NEW.pdf_profile IS NOT NULL OR NEW.pdf_external_identity IS NOT NULL OR NEW.pdf_deadline_at IS NOT NULL OR NEW.pdf_phase IS NOT NULL
BEGIN SELECT RAISE(ABORT,'zip PDF must attach after admission'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_binding_shape BEFORE UPDATE ON zip_attempts
WHEN NOT (
 (NEW.pdf_compute_id IS NULL AND NEW.pdf_source_identity IS NULL AND NEW.pdf_profile IS NULL AND NEW.pdf_external_identity IS NULL AND NEW.pdf_deadline_at IS NULL AND NEW.pdf_phase IS NULL)
 OR (NEW.state='running' AND NEW.pdf_compute_id IS NOT NULL AND NEW.pdf_source_identity IS NOT NULL AND length(NEW.pdf_source_identity)=64 AND NEW.pdf_source_identity NOT GLOB '*[^a-f0-9]*' AND NEW.pdf_profile IS NOT NULL AND length(NEW.pdf_profile)>0 AND NEW.pdf_external_identity IS NOT NULL AND length(NEW.pdf_external_identity)=64 AND NEW.pdf_external_identity NOT GLOB '*[^a-f0-9]*' AND typeof(NEW.pdf_deadline_at)='integer' AND NEW.pdf_deadline_at BETWEEN 0 AND 9007199254740991 AND NEW.pdf_phase IS NOT NULL
 AND EXISTS(SELECT 1 FROM zip_requests q JOIN zip_runs r ON r.request_id=q.id AND r.generation=NEW.generation JOIN zip_targets t ON t.request_id=q.id AND t.ordinal=NEW.ordinal JOIN pdf_computations c ON c.id=NEW.pdf_compute_id WHERE q.id=NEW.request_id AND q.format='pdf' AND q.generation=NEW.generation AND t.latest_attempt_number=NEW.attempt_number AND t.target_note_id=c.target_note_id AND c.source_identity=NEW.pdf_source_identity AND c.profile=NEW.pdf_profile AND NEW.pdf_deadline_at<=r.deadline_at))
)
BEGIN SELECT RAISE(ABORT,'zip PDF binding mismatch'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_binding_attach BEFORE UPDATE ON zip_attempts
WHEN OLD.pdf_compute_id IS NULL AND NEW.pdf_compute_id IS NOT NULL AND (NEW.pdf_phase!='waiting-pdf' OR EXISTS(SELECT 1 FROM zip_pdf_holds WHERE attempt_id=NEW.id) OR NOT EXISTS(SELECT 1 FROM zip_requests q JOIN zip_runs r ON r.request_id=q.id AND r.generation=NEW.generation WHERE q.id=NEW.request_id AND q.state='active' AND q.cancel_generation<NEW.generation AND r.state='running' AND NOT EXISTS(SELECT 1 FROM json_each(r.exclusions) e WHERE json_extract(e.value,'$.ordinal')=NEW.ordinal)))
BEGIN SELECT RAISE(ABORT,'zip PDF attachment unavailable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_binding_immutable BEFORE UPDATE ON zip_attempts
WHEN OLD.pdf_compute_id IS NOT NULL AND NEW.pdf_compute_id IS NOT NULL AND (NEW.pdf_compute_id!=OLD.pdf_compute_id OR NEW.pdf_source_identity!=OLD.pdf_source_identity OR NEW.pdf_profile!=OLD.pdf_profile OR NEW.pdf_external_identity!=OLD.pdf_external_identity OR NEW.pdf_deadline_at!=OLD.pdf_deadline_at OR (OLD.pdf_phase='copying' AND NEW.pdf_phase!='copying') OR (OLD.pdf_phase='copy-ready' AND NEW.pdf_phase='waiting-pdf'))
BEGIN SELECT RAISE(ABORT,'zip PDF binding is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_binding_ready BEFORE UPDATE ON zip_attempts
WHEN NEW.pdf_phase IN('copy-ready','copying') AND NOT EXISTS(SELECT 1 FROM zip_pdf_holds h WHERE h.attempt_id=NEW.id AND ((NEW.pdf_phase='copy-ready' AND h.state IN('held','closing')) OR (NEW.pdf_phase='copying' AND h.state IN('reading','closing'))))
BEGIN SELECT RAISE(ABORT,'zip PDF hold missing'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_binding_release BEFORE UPDATE ON zip_attempts
WHEN OLD.pdf_compute_id IS NOT NULL AND NEW.pdf_compute_id IS NULL AND (
 EXISTS(SELECT 1 FROM zip_pdf_holds h WHERE h.attempt_id=NEW.id AND h.state!='released') OR
 EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='zip-source' AND w.owner_id=NEW.id AND w.active=1) OR
 (OLD.pdf_phase='waiting-pdf' AND EXISTS(SELECT 1 FROM pdf_computations c WHERE c.id=OLD.pdf_compute_id AND c.state='stopping')))
BEGIN SELECT RAISE(ABORT,'zip PDF still owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_hold_insert BEFORE INSERT ON zip_pdf_holds
WHEN NEW.state!='held' OR NEW.version!=1 OR NOT EXISTS(
 SELECT 1 FROM zip_attempts p JOIN zip_runs r ON r.request_id=p.request_id AND r.generation=p.generation JOIN zip_requests q ON q.id=p.request_id JOIN pdf_artifacts a ON a.id=NEW.artifact_id
 WHERE p.id=NEW.attempt_id AND p.state='running' AND p.pdf_phase='waiting-pdf' AND p.pdf_deadline_at>NEW.acquired_at AND r.state='running' AND r.lease_until>NEW.acquired_at AND r.deadline_at>NEW.acquired_at AND q.state='active' AND q.generation=p.generation AND q.cancel_generation<p.generation
 AND NOT EXISTS(SELECT 1 FROM json_each(r.exclusions) e WHERE json_extract(e.value,'$.ordinal')=p.ordinal)
 AND a.state='ready' AND a.expires_at>NEW.acquired_at AND a.generation=NEW.artifact_generation AND a.compute_id=p.pdf_compute_id AND a.source_identity=p.pdf_source_identity AND a.profile=p.pdf_profile AND a.cleanup_token IS NULL
 AND NOT EXISTS(SELECT 1 FROM object_deletes d WHERE d.storage_key=a.storage_key))
BEGIN SELECT RAISE(ABORT,'zip PDF hold unavailable'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_hold_update BEFORE UPDATE ON zip_pdf_holds
WHEN NEW.attempt_id!=OLD.attempt_id OR NEW.artifact_id!=OLD.artifact_id OR NEW.artifact_generation!=OLD.artifact_generation OR NEW.acquired_at!=OLD.acquired_at OR NEW.version!=OLD.version+1 OR
 (OLD.state='held' AND NEW.state NOT IN('reading','closing')) OR
 (OLD.state='reading' AND (NEW.state!='closing' OR NEW.claim_token IS NOT OLD.claim_token OR NEW.runtime_id IS NOT OLD.runtime_id)) OR
 (OLD.state='closing' AND NEW.state!='released') OR OLD.state='released'
BEGIN SELECT RAISE(ABORT,'zip PDF hold transition'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_hold_release BEFORE UPDATE ON zip_pdf_holds
WHEN NEW.state='released' AND EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND ((w.kind='zip-source' AND w.owner_id=NEW.attempt_id) OR (w.kind='zip-spool' AND EXISTS(SELECT 1 FROM zip_spools s WHERE s.id=w.owner_id AND s.attempt_id=NEW.attempt_id))))
BEGIN SELECT RAISE(ABORT,'zip PDF copy still owned'); END;
--> statement-breakpoint
CREATE TRIGGER zip_pdf_hold_delete BEFORE DELETE ON zip_pdf_holds
WHEN OLD.state!='released' OR EXISTS(SELECT 1 FROM zip_attempts p WHERE p.id=OLD.attempt_id AND p.pdf_compute_id IS NOT NULL)
BEGIN SELECT RAISE(ABORT,'zip PDF hold retained'); END;
--> statement-breakpoint
CREATE TRIGGER pdf_artifact_zip_hold BEFORE UPDATE ON pdf_artifacts
WHEN ((OLD.state='cleanup' AND NEW.state='ready') OR NEW.state NOT IN('ready','cleanup') OR NEW.storage_key IS NOT OLD.storage_key OR NEW.file IS NOT OLD.file OR NEW.generation!=OLD.generation OR NEW.reserved_bytes!=OLD.reserved_bytes OR NEW.cleanup_token IS NOT NULL) AND EXISTS(SELECT 1 FROM zip_pdf_holds h WHERE h.artifact_id=OLD.id AND h.state!='released')
BEGIN SELECT RAISE(ABORT,'PDF pinned by ZIP'); END;
--> statement-breakpoint
CREATE TRIGGER object_delete_zip_pdf_hold BEFORE INSERT ON object_deletes
WHEN EXISTS(SELECT 1 FROM pdf_artifacts a JOIN zip_pdf_holds h ON h.artifact_id=a.id WHERE a.storage_key=NEW.storage_key AND h.state!='released')
BEGIN SELECT RAISE(ABORT,'PDF pinned by ZIP'); END;
--> statement-breakpoint
CREATE TRIGGER zip_run_pdf_terminal BEFORE UPDATE ON zip_runs
WHEN NEW.state IN('succeeded','partial','failed','cancelled') AND EXISTS(SELECT 1 FROM zip_attempts p WHERE p.request_id=NEW.request_id AND p.generation=NEW.generation AND (p.pdf_compute_id IS NOT NULL OR EXISTS(SELECT 1 FROM zip_pdf_holds h WHERE h.attempt_id=p.id AND h.state!='released')))
BEGIN SELECT RAISE(ABORT,'zip PDF work not closed'); END;
--> statement-breakpoint
CREATE TRIGGER auth_password_last_method BEFORE UPDATE OF password_hash ON accounts
WHEN (NEW.password_hash IS NULL AND NOT EXISTS(SELECT 1 FROM google_identities WHERE account_id=NEW.id)) AND NOT coalesce((OLD.state='active' AND NEW.state='deleted' AND EXISTS(SELECT 1 FROM account_deletions d WHERE d.id=NEW.deletion_id AND d.account_id=OLD.id AND d.fence_auth_version=NEW.auth_version)),0)
BEGIN SELECT RAISE(ABORT,'AUTH_LAST_METHOD'); END;
--> statement-breakpoint
CREATE TRIGGER auth_google_last_method BEFORE DELETE ON google_identities
WHEN (EXISTS(SELECT 1 FROM accounts WHERE id=OLD.account_id AND password_hash IS NULL)) AND NOT coalesce((EXISTS(SELECT 1 FROM accounts a JOIN account_deletions d ON d.id=a.deletion_id WHERE a.id=OLD.account_id AND a.state='deleted' AND d.account_id=a.id)),0)
BEGIN SELECT RAISE(ABORT,'AUTH_LAST_METHOD'); END;
--> statement-breakpoint
CREATE TRIGGER auth_google_immutable BEFORE UPDATE ON google_identities
BEGIN SELECT RAISE(ABORT,'AUTH_IDENTITY_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER auth_version_monotonic BEFORE UPDATE OF auth_version ON accounts
WHEN NEW.auth_version IS NULL OR NEW.auth_version<=OLD.auth_version OR NEW.auth_version>9007199254740991
BEGIN SELECT RAISE(ABORT,'AUTH_VERSION'); END;
--> statement-breakpoint
CREATE TRIGGER auth_browser_monotonic BEFORE UPDATE OF epoch ON auth_browser_contexts
WHEN NEW.epoch<=OLD.epoch
BEGIN SELECT RAISE(ABORT,'AUTH_BROWSER_EPOCH'); END;
--> statement-breakpoint
CREATE TRIGGER auth_browser_pinned BEFORE DELETE ON auth_browser_contexts
WHEN EXISTS(SELECT 1 FROM sessions WHERE browser_hash=OLD.browser_hash) OR EXISTS(SELECT 1 FROM google_auth_attempts WHERE browser_hash=OLD.browser_hash)
BEGIN SELECT RAISE(ABORT,'AUTH_BROWSER_PINNED'); END;
--> statement-breakpoint
CREATE TRIGGER auth_session_browser_insert BEFORE INSERT ON sessions
WHEN (NEW.browser_hash IS NULL) != (NEW.browser_epoch IS NULL) OR (NEW.browser_hash IS NOT NULL AND NOT EXISTS(SELECT 1 FROM auth_browser_contexts WHERE browser_hash=NEW.browser_hash AND epoch=NEW.browser_epoch))
BEGIN SELECT RAISE(ABORT,'AUTH_BROWSER_SESSION'); END;
--> statement-breakpoint
CREATE TRIGGER auth_session_browser_update BEFORE UPDATE OF browser_hash,browser_epoch ON sessions
WHEN (NEW.browser_hash IS NULL) != (NEW.browser_epoch IS NULL) OR (OLD.browser_hash IS NOT NULL AND (NEW.browser_hash IS NOT OLD.browser_hash OR NEW.browser_epoch IS NOT OLD.browser_epoch)) OR (NEW.browser_hash IS NOT NULL AND NOT EXISTS(SELECT 1 FROM auth_browser_contexts WHERE browser_hash=NEW.browser_hash AND epoch=NEW.browser_epoch))
BEGIN SELECT RAISE(ABORT,'AUTH_BROWSER_SESSION'); END;
--> statement-breakpoint
CREATE TRIGGER auth_attempt_shape_insert BEFORE INSERT ON google_auth_attempts
WHEN NOT coalesce(
 NEW.mode IN ('login','link','reauth') AND NEW.state IN ('pending','exchanging','verified','proof-required','reauth-ready','completed','failed')
 AND NEW.browser_epoch BETWEEN 1 AND 9007199254740991 AND NEW.version BETWEEN 1 AND 9007199254740991
 AND ((NEW.actor_account_id IS NULL AND NEW.actor_session_hash IS NULL AND NEW.actor_auth_version IS NULL AND NEW.mode='login') OR (NEW.actor_account_id IS NOT NULL AND NEW.actor_session_hash IS NOT NULL AND NEW.actor_auth_version IS NOT NULL AND NEW.actor_auth_version>=1))
 AND ((NEW.target_account_id IS NULL AND NEW.target_auth_version IS NULL AND NEW.state!='proof-required') OR (NEW.target_account_id IS NOT NULL AND NEW.target_auth_version IS NOT NULL AND NEW.target_auth_version>=1 AND NEW.state IN ('verified','proof-required')))
 AND ((NEW.state='completed' AND NEW.result_account_id IS NOT NULL) OR (NEW.state!='completed' AND NEW.result_account_id IS NULL))
 AND ((NEW.state='failed' AND NEW.failure IN ('AUTH_EXPIRED','AUTH_CONTEXT_CHANGED','AUTH_EXCHANGE_UNKNOWN','AUTH_PROVIDER_REJECTED','AUTH_UNVERIFIED','AUTH_CONFLICT','AUTH_CANCELLED')) OR (NEW.state!='failed' AND NEW.failure IS NULL))
 AND json_valid(NEW.return_to) AND (NEW.claims IS NULL OR json_valid(NEW.claims)),0)
BEGIN SELECT RAISE(ABORT,'AUTH_ATTEMPT_SHAPE'); END;
--> statement-breakpoint
CREATE TRIGGER auth_attempt_shape_update BEFORE UPDATE ON google_auth_attempts
WHEN NOT coalesce(
 NEW.mode IN ('login','link','reauth') AND NEW.state IN ('pending','exchanging','verified','proof-required','reauth-ready','completed','failed')
 AND NEW.browser_epoch BETWEEN 1 AND 9007199254740991 AND NEW.version BETWEEN 1 AND 9007199254740991
 AND ((NEW.actor_account_id IS NULL AND NEW.actor_session_hash IS NULL AND NEW.actor_auth_version IS NULL AND NEW.mode='login') OR (NEW.actor_account_id IS NOT NULL AND NEW.actor_session_hash IS NOT NULL AND NEW.actor_auth_version IS NOT NULL AND NEW.actor_auth_version>=1))
 AND ((NEW.target_account_id IS NULL AND NEW.target_auth_version IS NULL AND NEW.state!='proof-required') OR (NEW.target_account_id IS NOT NULL AND NEW.target_auth_version IS NOT NULL AND NEW.target_auth_version>=1 AND NEW.state IN ('verified','proof-required')))
 AND ((NEW.state='completed' AND NEW.result_account_id IS NOT NULL) OR (NEW.state!='completed' AND NEW.result_account_id IS NULL))
 AND ((NEW.state='failed' AND NEW.failure IN ('AUTH_EXPIRED','AUTH_CONTEXT_CHANGED','AUTH_EXCHANGE_UNKNOWN','AUTH_PROVIDER_REJECTED','AUTH_UNVERIFIED','AUTH_CONFLICT','AUTH_CANCELLED')) OR (NEW.state!='failed' AND NEW.failure IS NULL))
 AND json_valid(NEW.return_to) AND (NEW.claims IS NULL OR json_valid(NEW.claims)),0)
BEGIN SELECT RAISE(ABORT,'AUTH_ATTEMPT_SHAPE'); END;
--> statement-breakpoint
CREATE TRIGGER auth_attempt_immutable BEFORE UPDATE ON google_auth_attempts
WHEN NEW.id IS NOT OLD.id OR NEW.state_hash IS NOT OLD.state_hash OR NEW.nonce_hash IS NOT OLD.nonce_hash OR NEW.mode IS NOT OLD.mode OR NEW.browser_hash IS NOT OLD.browser_hash OR NEW.browser_epoch IS NOT OLD.browser_epoch OR NEW.actor_account_id IS NOT OLD.actor_account_id OR NEW.actor_session_hash IS NOT OLD.actor_session_hash OR NEW.actor_auth_version IS NOT OLD.actor_auth_version OR NEW.return_to IS NOT OLD.return_to OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at OR NEW.version<=OLD.version OR OLD.state IN ('completed','failed')
BEGIN SELECT RAISE(ABORT,'AUTH_ATTEMPT_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER auth_challenge_shape_insert BEFORE INSERT ON account_auth_challenges
WHEN NOT coalesce(NEW.auth_version>=1 AND NEW.generation>=1 AND ((NEW.purpose='reset' AND NEW.attempt_id IS NULL AND NEW.subject IS NULL AND NEW.browser_hash IS NULL AND NEW.browser_epoch IS NULL) OR (NEW.purpose='google-link' AND NEW.attempt_id IS NOT NULL AND NEW.subject IS NOT NULL AND NEW.browser_hash IS NOT NULL AND NEW.browser_epoch IS NOT NULL AND NEW.browser_epoch>=1 AND EXISTS(SELECT 1 FROM google_auth_attempts a WHERE a.id=NEW.attempt_id AND a.state='proof-required' AND a.target_account_id=NEW.account_id AND a.target_auth_version=NEW.auth_version AND a.browser_hash=NEW.browser_hash AND a.browser_epoch=NEW.browser_epoch AND json_extract(a.claims,'$.subject')=NEW.subject AND NEW.expires_at<=a.expires_at))),0)
BEGIN SELECT RAISE(ABORT,'AUTH_CHALLENGE_SHAPE'); END;
--> statement-breakpoint
CREATE TRIGGER auth_challenge_immutable BEFORE UPDATE ON account_auth_challenges
WHEN NEW.token_hash IS NOT OLD.token_hash OR NEW.purpose IS NOT OLD.purpose OR NEW.account_id IS NOT OLD.account_id OR NEW.auth_version IS NOT OLD.auth_version OR NEW.email IS NOT OLD.email OR NEW.generation IS NOT OLD.generation OR NEW.attempt_id IS NOT OLD.attempt_id OR NEW.subject IS NOT OLD.subject OR NEW.browser_hash IS NOT OLD.browser_hash OR NEW.browser_epoch IS NOT OLD.browser_epoch OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at OR OLD.consumed_at IS NOT NULL OR NEW.consumed_at IS NULL
BEGIN SELECT RAISE(ABORT,'AUTH_CHALLENGE_IMMUTABLE'); END;
--> statement-breakpoint
CREATE TRIGGER openrouter_connection_update_guard BEFORE UPDATE ON openrouter_connections
WHEN NEW.account_id != OLD.account_id OR NEW.version != OLD.version + 1
 OR NEW.epoch NOT IN (OLD.epoch, OLD.epoch + 1)
 OR (OLD.ever_linked_at IS NOT NULL AND NEW.ever_linked_at IS NOT OLD.ever_linked_at AND NOT (coalesce(
   OLD.credential_envelope IS NOT NULL
   AND NEW.account_id = OLD.account_id AND NEW.version = OLD.version + 1 AND NEW.epoch = OLD.epoch + 1
   AND NEW.state = 'unlinked' AND NEW.ever_linked_at IS NULL
   AND NEW.credential_envelope IS NULL AND NEW.provider_user_id IS NULL AND NEW.key_expires_at IS NULL
   AND NEW.linked_at IS NULL AND NEW.last_used_at IS NULL
   AND EXISTS(
     SELECT 1 FROM accounts a
     JOIN account_deletions d ON d.id = a.deletion_id AND d.account_id = a.id AND d.fence_auth_version = a.auth_version
     JOIN account_deletion_credential_origins o ON o.account_id = a.id AND o.provider = 'openrouter' AND o.mode = 'native-v1' AND o.credential_epoch = OLD.epoch
     JOIN account_deletion_credential_uses u ON u.id = o.use_id AND u.provider = o.provider AND u.account_id = a.id AND u.result_account_id = a.id
     WHERE a.id = OLD.account_id AND a.state = 'deleted'
       AND d.state = 'running' AND d.cursor_table = 'openrouter-connection' AND d.lease_token IS NOT NULL AND d.lease_until >= NEW.updated_at
       AND u.state = 'closed' AND u.caller_ended = 1 AND u.acknowledged = 1 AND u.evidence_id IS NOT NULL
   ),0) OR coalesce(
   OLD.state = 'unlinked' AND OLD.credential_envelope IS NULL AND OLD.provider_user_id IS NULL
   AND OLD.key_expires_at IS NULL AND OLD.linked_at IS NULL AND OLD.last_used_at IS NULL
   AND NEW.account_id = OLD.account_id AND NEW.version = OLD.version + 1 AND NEW.epoch = OLD.epoch + 1
   AND NEW.state = 'unlinked' AND NEW.ever_linked_at IS NULL
   AND NEW.credential_envelope IS NULL AND NEW.provider_user_id IS NULL AND NEW.key_expires_at IS NULL
   AND NEW.linked_at IS NULL AND NEW.last_used_at IS NULL
   AND EXISTS(
     SELECT 1 FROM accounts a
     JOIN account_deletions d ON d.id = a.deletion_id AND d.account_id = a.id AND d.fence_auth_version = a.auth_version
     JOIN account_deletion_credential_origins o ON o.account_id = a.id AND o.provider = 'openrouter' AND o.mode = 'native-v1' AND o.credential_epoch = OLD.epoch - 1
     JOIN account_deletion_credential_uses u ON u.id = o.use_id AND u.provider = o.provider AND u.account_id = a.id AND u.result_account_id = a.id
     WHERE a.id = OLD.account_id AND a.state = 'deleted'
       AND d.state = 'running' AND d.cursor_table = 'openrouter-connection' AND d.lease_token IS NOT NULL AND d.lease_until >= NEW.updated_at
       AND u.state = 'closed' AND u.caller_ended = 1 AND u.acknowledged = 1 AND u.evidence_id IS NOT NULL
       AND NOT EXISTS(SELECT 1 FROM account_deletion_debts debt WHERE debt.intent_id = d.id)
   )
   AND NOT EXISTS(SELECT 1 FROM openrouter_attempts attempt WHERE attempt.account_id = OLD.account_id AND attempt.state IN('exchanging','checking'))
   AND (NOT EXISTS(SELECT 1 FROM drive_authorization_attempts x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='authorization' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_control_operations x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='control' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0 OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='backup' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN regeneration_source_attempts x ON x.binding_id=b.id WHERE (b.executor_id=OLD.account_id OR b.credential_owner_id=OLD.account_id) AND NOT coalesce(x.phase='terminal' AND (json_extract(x.completion,'$.kind')='never-owned' OR (x.owner_state='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE (u.account_id=OLD.account_id OR u.result_account_id=OLD.account_id) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1))
AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (w.note_id IN(SELECT id FROM notes WHERE owner_account_id=OLD.account_id AND owner_workspace_id IS NULL) OR w.owner_id IN(SELECT id FROM drive_backup_transfers WHERE account_id=OLD.account_id))))
   AND NOT (      exists(select 1 from drive_authorization_attempts where account_id=OLD.account_id and owner_state in('active','unknown'))
      or exists(select 1 from drive_control_operations where account_id=OLD.account_id and owner_state in('active','unknown'))
      or exists(select 1 from drive_backup_transfers where account_id=OLD.account_id and (owner_state in('active','unknown') or read_pinned!=0 or refresh_pending!=0))
      or exists(select 1 from regeneration_source_bindings b join regeneration_source_attempts a on a.binding_id=b.id where (b.executor_id=OLD.account_id or b.credential_owner_id=OLD.account_id) and (a.owner_state in('active','unknown') or (a.owner_state='closed' and (coalesce(json_extract(a.completion,'$.callerEnded'),0)!=1 or coalesce(json_extract(a.completion,'$.acknowledged'),0)!=1))))
      or exists(select 1 from llm_conversions where account_id=OLD.account_id and (owner_state in('active','unknown') or source_memory_bytes!=0 or (source_input_receipt is not null and json_extract(source_input_receipt,'$.state')!='closed')))
      or exists(select 1 from llm_pdf_previews where account_id=OLD.account_id and (owner_state in('active','unknown') or source_memory_bytes!=0 or (source_input_receipt is not null and json_extract(source_input_receipt,'$.state')!='closed')))
      or exists(select 1 from machine_regenerations where executor_id=OLD.account_id and (owner_state in('active','unknown') or source_memory_bytes!=0 or (source_input_receipt is not null and json_extract(source_input_receipt,'$.state')!='closed')))
      or exists(select 1 from account_deletion_credential_uses where (account_id=OLD.account_id or result_account_id=OLD.account_id) and (state!='closed' or caller_ended!=1 or acknowledged!=1))
      or exists(select 1 from drive_authorization_attempts d where d.account_id=OLD.account_id and d.owner_state='closed' and not exists(select 1 from account_deletion_drive_acknowledgments a where a.kind='authorization' and a.id=d.id and a.runtime_generation=d.runtime_generation and a.owner_token=d.owner_token))
      or exists(select 1 from drive_control_operations d where d.account_id=OLD.account_id and d.owner_state='closed' and not exists(select 1 from account_deletion_drive_acknowledgments a where a.kind='control' and a.id=d.id and a.runtime_generation=d.runtime_generation and a.owner_token=d.owner_token))
      or exists(select 1 from drive_backup_transfers d where d.account_id=OLD.account_id and d.owner_state='closed' and not exists(select 1 from account_deletion_drive_acknowledgments a where a.kind='backup' and a.id=d.id and a.runtime_generation=d.runtime_generation and a.owner_token=d.owner_token))
      or exists(select 1 from object_writes w where w.active=1 and (w.note_id in(select id from notes where owner_account_id=OLD.account_id and owner_workspace_id is null) or w.owner_id in(select id from drive_backup_transfers where account_id=OLD.account_id))))
   ,0)))
 OR (NEW.epoch = OLD.epoch AND (
   NEW.credential_envelope IS NOT OLD.credential_envelope
   OR NEW.linked_at IS NOT OLD.linked_at
   OR NEW.provider_user_id IS NOT OLD.provider_user_id
   OR NEW.key_expires_at IS NOT OLD.key_expires_at
   OR (NEW.state != OLD.state AND NOT (OLD.state = 'linked' AND NEW.state = 'needs_relink'))
 ))
 OR (NEW.epoch = OLD.epoch + 1 AND NEW.state = 'needs_relink')
BEGIN SELECT RAISE(ABORT, 'openrouter_connection_update_guard'); END;
--> statement-breakpoint
CREATE TRIGGER openrouter_attempt_insert_guard BEFORE INSERT ON openrouter_attempts
WHEN NEW.state != 'pending' OR NEW.version != 1
BEGIN SELECT RAISE(ABORT, 'openrouter_attempt_insert_guard'); END;
--> statement-breakpoint
CREATE TRIGGER openrouter_attempt_update_guard BEFORE UPDATE ON openrouter_attempts
WHEN NEW.id != OLD.id OR NEW.correlation_hash != OLD.correlation_hash
 OR NEW.account_id != OLD.account_id OR NEW.session_hash != OLD.session_hash
 OR NEW.auth_version != OLD.auth_version OR NEW.browser_hash != OLD.browser_hash
 OR NEW.browser_epoch != OLD.browser_epoch OR NEW.expected_epoch != OLD.expected_epoch
 OR NEW.expected_version != OLD.expected_version OR NEW.return_to != OLD.return_to
 OR NEW.created_at != OLD.created_at OR NEW.expires_at != OLD.expires_at
 OR NEW.version != OLD.version + 1
 OR NOT ((OLD.state = 'pending' AND NEW.state IN ('exchanging','failed'))
   OR (OLD.state = 'exchanging' AND NEW.state IN ('checking','failed'))
   OR (OLD.state = 'checking' AND NEW.state IN ('checking','completed','failed')))
 OR (OLD.state = 'checking' AND NEW.state = 'checking' AND NEW.candidate_envelope IS NOT OLD.candidate_envelope)
BEGIN SELECT RAISE(ABORT, 'openrouter_attempt_update_guard'); END;
--> statement-breakpoint
CREATE TRIGGER openrouter_models_update_guard BEFORE UPDATE ON openrouter_model_settings
WHEN NEW.account_id != OLD.account_id OR NEW.version != OLD.version + 1
 OR NEW.defaults_version != OLD.defaults_version
BEGIN SELECT RAISE(ABORT, 'openrouter_models_update_guard'); END;
--> statement-breakpoint
CREATE TRIGGER llm_reservation_identity BEFORE UPDATE ON llm_quota_reservations
WHEN NEW.job_id!=OLD.job_id OR NEW.account_id!=OLD.account_id OR NEW.month!=OLD.month
 OR NEW.created_at!=OLD.created_at
 OR (OLD.first_intent_at IS NOT NULL AND NEW.first_intent_at IS NOT OLD.first_intent_at)
 OR NOT ((OLD.state='reserved' AND NEW.state IN ('consumed','released')) OR (OLD.state='consumed' AND NEW.state='released'))
BEGIN SELECT RAISE(ABORT,'llm_reservation_identity'); END;
--> statement-breakpoint
CREATE TRIGGER llm_fence_monotonic BEFORE UPDATE ON llm_account_fences
WHEN NEW.account_id!=OLD.account_id OR NEW.sequence!=OLD.sequence+1
BEGIN SELECT RAISE(ABORT,'llm_fence_monotonic'); END;
--> statement-breakpoint
CREATE TRIGGER openrouter_attempt_admission_update BEFORE UPDATE ON openrouter_attempts
WHEN NEW.confirmed_admission_sequence IS NOT OLD.confirmed_admission_sequence AND
 (OLD.state!='checking' OR NEW.state!='checking' OR NEW.confirmed_admission_sequence IS NULL
  OR NEW.confirmed_admission_sequence < coalesce(OLD.confirmed_admission_sequence,0))
BEGIN SELECT RAISE(ABORT,'openrouter_attempt_admission_update'); END;
--> statement-breakpoint
CREATE TRIGGER llm_conversion_pin BEFORE DELETE ON llm_conversions
WHEN OLD.phase!='terminal' OR OLD.owner_state IN ('active','unknown') OR OLD.response_budget!=0
BEGIN SELECT RAISE(ABORT,'llm_conversion_pin'); END;
--> statement-breakpoint
CREATE TRIGGER llm_dispatch_intent BEFORE UPDATE ON llm_dispatches
WHEN NEW.state='intent' AND NOT EXISTS (
 SELECT 1 FROM llm_conversions c JOIN llm_quota_reservations q ON q.job_id=c.job_id
 JOIN openrouter_connections k ON k.account_id=c.account_id
 WHERE c.job_id=NEW.job_id AND c.owner_state='active' AND c.owner_token=NEW.owner_token
 AND c.runtime_id=NEW.runtime_id AND c.selection_state='fixed' AND c.phase='dispatching' AND c.outcome='pending'
 AND c.cancel_generation=0 AND c.response_budget=2097152
 AND k.epoch=c.credential_epoch AND k.state='linked' AND q.state IN ('reserved','consumed')
)
BEGIN SELECT RAISE(ABORT,'llm_dispatch_fenced'); END;
--> statement-breakpoint
CREATE TRIGGER llm_dispatch_pin BEFORE DELETE ON llm_dispatches
WHEN EXISTS (SELECT 1 FROM llm_conversions c WHERE c.job_id=OLD.job_id AND
 (c.phase!='terminal' OR c.owner_state IN ('active','unknown') OR c.response_budget!=0))
BEGIN SELECT RAISE(ABORT,'llm_dispatch_pin'); END;
--> statement-breakpoint
CREATE TRIGGER llm_reservation_release BEFORE UPDATE ON llm_quota_reservations
WHEN NEW.state='released' AND (
 EXISTS (SELECT 1 FROM llm_conversions c WHERE c.job_id=OLD.job_id AND (c.phase!='terminal' OR c.owner_state IN ('active','unknown')))
 OR EXISTS (SELECT 1 FROM llm_dispatches d WHERE d.job_id=OLD.job_id AND d.state NOT IN ('prepared','not-sent'))
)
BEGIN SELECT RAISE(ABORT,'llm_reservation_release'); END;
--> statement-breakpoint
CREATE TRIGGER llm_dispatch_identity BEFORE UPDATE ON llm_dispatches
WHEN NEW.job_id != OLD.job_id OR NEW.ordinal != OLD.ordinal OR NEW.id != OLD.id
 OR NEW.input_sha256 != OLD.input_sha256 OR NEW.owner_token != OLD.owner_token OR NEW.runtime_id != OLD.runtime_id
 OR (OLD.intent_at IS NOT NULL AND NEW.intent_at IS NOT OLD.intent_at)
 OR NOT ((OLD.state='prepared' AND NEW.state='intent')
   OR (OLD.state='intent' AND NEW.state IN ('response','unknown','not-sent'))
   OR (OLD.state='response' AND NEW.state='scrubbed'))
BEGIN SELECT RAISE(ABORT,'llm_dispatch_identity'); END;
--> statement-breakpoint
CREATE TRIGGER llm_dispatch_recipe BEFORE INSERT ON llm_dispatches
WHEN NOT EXISTS (
 SELECT 1 FROM llm_conversions c WHERE c.job_id=NEW.job_id AND c.selection_state='fixed'
 AND ((coalesce(c.preparation_version,1) IN (1,2) AND NEW.ordinal BETWEEN 0 AND 15)
 OR (c.preparation_version=3 AND NEW.ordinal=0)
 OR (c.preparation_version=4 AND NEW.ordinal>=0 AND NEW.ordinal<json_extract(c.pdf_selection_manifest,'$.manifest.total')))
)
BEGIN SELECT RAISE(ABORT,'llm_dispatch_recipe'); END;
--> statement-breakpoint
CREATE TRIGGER llm_conversion_queue BEFORE INSERT ON llm_conversions
WHEN NEW.phase='queued' AND (SELECT count(*) FROM llm_conversions WHERE account_id=NEW.account_id AND phase='queued')
 +(SELECT count(*) FROM llm_pdf_previews WHERE account_id=NEW.account_id AND state='queued')>=100
BEGIN SELECT RAISE(ABORT,'llm_account_queue_full'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_preview_admission BEFORE INSERT ON llm_pdf_previews
WHEN NEW.state!='queued' OR NEW.owner_state!='idle' OR NEW.cancel_generation!=0 OR NEW.version!=1
 OR (SELECT count(*) FROM llm_conversions WHERE account_id=NEW.account_id AND phase='queued')
 +(SELECT count(*) FROM llm_pdf_previews WHERE account_id=NEW.account_id AND state='queued')>=100
 OR (SELECT count(*) FROM llm_pdf_previews WHERE account_id=NEW.account_id AND state IN ('consumed','failed','cancelled','expired'))>=100
 OR EXISTS(SELECT 1 FROM llm_conversions c WHERE c.note_id=NEW.note_id AND (c.phase!='terminal' OR c.owner_state IN ('active','unknown')))
BEGIN SELECT RAISE(ABORT,'llm_pdf_preview_admission'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_preview_consume BEFORE UPDATE ON llm_pdf_previews
WHEN NEW.state='consumed' AND OLD.state!='consumed' AND (
 OLD.state!='ready' OR OLD.cancel_generation!=0 OR NEW.cancel_generation!=0 OR NEW.updated_at>=OLD.expires_at
 OR NOT EXISTS(SELECT 1 FROM llm_conversions c WHERE c.job_id=NEW.consumed_job_id AND c.selection_state='fixed' AND c.operation='regenerate'
 AND c.account_id=OLD.account_id AND c.note_id=OLD.note_id AND c.note_version=OLD.note_version
 AND c.original_id=OLD.original_id AND c.source_sha256=OLD.source_sha256 AND c.source_bytes=OLD.source_bytes
 AND c.source_ownership_generation=OLD.ownership_generation AND c.credential_epoch=OLD.credential_epoch
 AND c.pdf_selection_manifest=OLD.result_json)
)
BEGIN SELECT RAISE(ABORT,'llm_pdf_preview_consumed'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_preview_pin BEFORE DELETE ON llm_pdf_previews
WHEN OLD.state IN ('queued','running','unknown') OR OLD.owner_state IN ('active','unknown')
BEGIN SELECT RAISE(ABORT,'llm_pdf_preview_pin'); END;
--> statement-breakpoint
CREATE TRIGGER drive_connection_update_guard BEFORE UPDATE ON drive_connections
WHEN NEW.account_id IS NOT OLD.account_id OR NEW.version != OLD.version + 1 OR NEW.updated_at < OLD.updated_at
 OR NEW.epoch < OLD.epoch OR NEW.epoch > OLD.epoch + 1
 OR NEW.credential_version < OLD.credential_version OR NEW.credential_version > OLD.credential_version + 1
 OR NEW.settings_version < OLD.settings_version OR NEW.settings_version > OLD.settings_version + 1
 OR NEW.admission_sequence < OLD.admission_sequence OR NEW.admission_sequence > OLD.admission_sequence + 1
 OR (NEW.epoch = OLD.epoch AND json_extract(NEW.credential,'$.subject') IS NOT json_extract(OLD.credential,'$.subject'))
 OR (NEW.epoch != OLD.epoch AND (NEW.credential_version != OLD.credential_version + 1 OR NEW.settings_version != OLD.settings_version + 1 OR NEW.folder IS NOT NULL OR NEW.last_used_at IS NOT NULL OR NEW.auto_backup != 0))
 OR (NEW.auto_backup != OLD.auto_backup AND NEW.settings_version != OLD.settings_version + 1)
 OR (NEW.auto_backup = 1 AND OLD.auto_backup = 0 AND NEW.state != 'linked')
BEGIN SELECT RAISE(ABORT,'DRIVE_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_attempt_update_guard BEFORE UPDATE ON drive_authorization_attempts
WHEN NEW.id IS NOT OLD.id OR NEW.account_id IS NOT OLD.account_id OR NEW.command_id IS NOT OLD.command_id
 OR NEW.intent_digest IS NOT OLD.intent_digest
 OR (NEW.terminal_at IS NULL AND NEW.confirmed_folder_ids_envelope IS NOT OLD.confirmed_folder_ids_envelope)
 OR NEW.state_hash IS NOT OLD.state_hash OR NEW.nonce_hash IS NOT OLD.nonce_hash OR NEW.return_to IS NOT OLD.return_to
 OR NEW.confirmed_admission_sequence IS NOT OLD.confirmed_admission_sequence
 OR NEW.expected_epoch IS NOT OLD.expected_epoch OR NEW.expected_credential_version IS NOT OLD.expected_credential_version OR NEW.expected_settings_version IS NOT OLD.expected_settings_version
 OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at OR NEW.version != OLD.version + 1 OR NEW.updated_at < OLD.updated_at
 OR NEW.cancel_generation < OLD.cancel_generation OR NEW.cancel_generation > OLD.cancel_generation + 1
 OR (NEW.session_hash IS NOT NULL AND (NEW.session_hash IS NOT OLD.session_hash OR NEW.auth_version IS NOT OLD.auth_version OR NEW.browser_hash IS NOT OLD.browser_hash OR NEW.browser_epoch IS NOT OLD.browser_epoch))
 OR (NEW.session_hash IS NULL AND OLD.session_hash IS NOT NULL AND (OLD.terminal_at IS NULL OR NEW.updated_at < OLD.terminal_at + 86400000 OR OLD.owner_state IN ('active','unknown')))
 OR (OLD.terminal_at IS NOT NULL AND (NEW.phase IS NOT OLD.phase OR NEW.data IS NOT OLD.data OR NEW.terminal_at IS NOT OLD.terminal_at))
 OR (OLD.terminal_at IS NOT NULL AND OLD.owner_state IN ('none','closed') AND NEW.owner_state IN ('active','unknown'))
 OR (OLD.owner_state IN ('active','unknown') AND (NEW.runtime_generation IS NOT OLD.runtime_generation OR NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state NOT IN ('active','unknown','closed')))
 OR (OLD.owner_state = 'unknown' AND NEW.owner_state = 'active')
 OR (OLD.owner_state = 'closed' AND NOT ((NEW.owner_state = 'closed' AND NEW.runtime_generation IS OLD.runtime_generation AND NEW.owner_token IS OLD.owner_token) OR (NEW.owner_state = 'active' AND (NEW.runtime_generation IS NOT OLD.runtime_generation OR NEW.owner_token IS NOT OLD.owner_token))))
 OR (NEW.cancel_generation > 0 AND NEW.phase != OLD.phase AND NEW.phase != 'failed')
BEGIN SELECT RAISE(ABORT,'DRIVE_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_attempt_delete_owner_guard BEFORE DELETE ON drive_authorization_attempts
WHEN OLD.owner_state IN ('active','unknown') BEGIN SELECT RAISE(ABORT,'DRIVE_OWNER_ACTIVE'); END;
--> statement-breakpoint
CREATE TRIGGER drive_control_delete_owner_guard BEFORE DELETE ON drive_control_operations
WHEN OLD.owner_state IN ('active','unknown') BEGIN SELECT RAISE(ABORT,'DRIVE_OWNER_ACTIVE'); END;
--> statement-breakpoint
CREATE TRIGGER drive_attempt_command_insert_guard BEFORE INSERT ON drive_authorization_attempts
WHEN EXISTS(SELECT 1 FROM drive_control_operations WHERE account_id = NEW.account_id AND command_id = NEW.command_id)
BEGIN SELECT RAISE(ABORT,'DRIVE_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_control_command_insert_guard BEFORE INSERT ON drive_control_operations
WHEN EXISTS(SELECT 1 FROM drive_authorization_attempts WHERE account_id = NEW.account_id AND command_id = NEW.command_id)
BEGIN SELECT RAISE(ABORT,'DRIVE_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_control_update_guard BEFORE UPDATE ON drive_control_operations
WHEN NEW.id IS NOT OLD.id OR NEW.account_id IS NOT OLD.account_id OR NEW.command_id IS NOT OLD.command_id
 OR NEW.intent_digest IS NOT OLD.intent_digest
 OR NEW.subject IS NOT OLD.subject OR NEW.kind IS NOT OLD.kind
 OR (NEW.credential_use IS NOT OLD.credential_use AND NOT coalesce((
   (OLD.terminal_at IS NULL AND OLD.cancel_generation = 0 AND OLD.owner_state IN ('none','closed') AND NEW.owner_state = 'active' AND json_extract(NEW.credential_use,'$.kind') = 'bound' AND
    json_extract(NEW.credential_use,'$.version') = (SELECT credential_version FROM drive_connections WHERE account_id = NEW.account_id AND epoch = NEW.expected_epoch AND settings_version = NEW.expected_settings_version AND state = 'linked' AND json_extract(credential,'$.subject') = NEW.subject)) OR
   (OLD.terminal_at IS NULL AND OLD.cancel_generation = 0 AND OLD.owner_state = 'active' AND NEW.owner_state = 'active' AND NEW.owner_token IS OLD.owner_token AND NEW.runtime_generation IS OLD.runtime_generation AND NEW.phase IS OLD.phase AND NEW.data IS OLD.data AND
    json_extract(OLD.credential_use,'$.kind') = 'bound' AND json_extract(NEW.credential_use,'$.kind') = 'self-refreshed' AND json_extract(NEW.credential_use,'$.fromVersion') = json_extract(OLD.credential_use,'$.version') AND
    json_extract(NEW.credential_use,'$.version') = (SELECT credential_version FROM drive_connections WHERE account_id = NEW.account_id AND epoch = NEW.expected_epoch AND settings_version = NEW.expected_settings_version AND state = 'linked' AND json_extract(credential,'$.subject') = NEW.subject))
 ),0))
 OR (NEW.phase = 'verifying-target' AND OLD.phase != 'verifying-target' AND NOT (
   OLD.phase = 'ready' AND OLD.owner_state = 'closed' AND NEW.owner_state = 'active' AND
   json_extract(NEW.data,'$.confirmedReadyVersion') = OLD.version AND
   json_extract(NEW.data,'$.sourceId') IS json_extract(OLD.data,'$.sourceId') AND
   json_extract(NEW.data,'$.targetId') IS json_extract(OLD.data,'$.targetId') AND
   json_extract(NEW.data,'$.targetKeyEnvelope') IS json_extract(OLD.data,'$.targetKeyEnvelope')
 ))
 OR NEW.expected_epoch IS NOT OLD.expected_epoch OR NEW.expected_credential_version IS NOT OLD.expected_credential_version OR NEW.expected_settings_version IS NOT OLD.expected_settings_version
 OR NEW.created_at IS NOT OLD.created_at OR NEW.expires_at IS NOT OLD.expires_at OR NEW.version != OLD.version + 1 OR NEW.updated_at < OLD.updated_at
 OR NEW.cancel_generation < OLD.cancel_generation OR NEW.cancel_generation > OLD.cancel_generation + 1
 OR (NEW.session_hash IS NOT NULL AND (NEW.session_hash IS NOT OLD.session_hash OR NEW.auth_version IS NOT OLD.auth_version OR NEW.browser_hash IS NOT OLD.browser_hash OR NEW.browser_epoch IS NOT OLD.browser_epoch))
 OR (NEW.session_hash IS NULL AND OLD.session_hash IS NOT NULL AND (OLD.terminal_at IS NULL OR NEW.updated_at < OLD.terminal_at + 86400000 OR OLD.owner_state IN ('active','unknown')))
 OR (OLD.terminal_at IS NOT NULL AND (NEW.phase IS NOT OLD.phase OR NEW.data IS NOT OLD.data OR NEW.terminal_at IS NOT OLD.terminal_at))
 OR (OLD.terminal_at IS NOT NULL AND OLD.owner_state IN ('none','closed') AND NEW.owner_state IN ('active','unknown'))
 OR (OLD.owner_state IN ('active','unknown') AND (NEW.runtime_generation IS NOT OLD.runtime_generation OR NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state NOT IN ('active','unknown','closed')))
 OR (OLD.owner_state = 'unknown' AND NEW.owner_state = 'active')
 OR (OLD.owner_state = 'closed' AND NOT ((NEW.owner_state = 'closed' AND NEW.runtime_generation IS OLD.runtime_generation AND NEW.owner_token IS OLD.owner_token) OR (NEW.owner_state = 'active' AND (NEW.runtime_generation IS NOT OLD.runtime_generation OR NEW.owner_token IS NOT OLD.owner_token))))
 OR (NEW.cancel_generation > 0 AND NEW.phase != OLD.phase AND NEW.phase != 'failed')
 OR (OLD.kind = 'folder-create' AND json_type(OLD.data,'$.fileId') = 'text' AND (
   coalesce(json_extract(NEW.data,'$.fileId'),json_extract(NEW.data,'$.identity.fileId')) IS NOT json_extract(OLD.data,'$.fileId') OR
   coalesce(json_extract(NEW.data,'$.marker'),json_extract(NEW.data,'$.identity.marker')) IS NOT json_extract(OLD.data,'$.marker') OR
   coalesce(json_extract(NEW.data,'$.sends'),json_extract(NEW.data,'$.identity.sends')) NOT BETWEEN json_extract(OLD.data,'$.sends') AND json_extract(OLD.data,'$.sends') + 1 OR
   (NEW.phase = 'running' AND (OLD.phase != 'running' OR NEW.owner_token IS NOT OLD.owner_token OR NEW.runtime_generation IS NOT OLD.runtime_generation) AND
    (NEW.owner_state != 'active' OR OLD.owner_state NOT IN ('none','closed') OR json_extract(NEW.data,'$.sends') IS NOT json_extract(OLD.data,'$.sends') + 1)) OR
   (coalesce(json_extract(NEW.data,'$.sends'),json_extract(NEW.data,'$.identity.sends')) != json_extract(OLD.data,'$.sends') AND
    (NEW.phase != 'running' OR NEW.owner_state != 'active' OR OLD.owner_state NOT IN ('none','closed')))))
BEGIN SELECT RAISE(ABORT,'DRIVE_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_request_insert_guard BEFORE INSERT ON drive_backup_requests
WHEN NEW.version != 1
 OR EXISTS(SELECT 1 FROM drive_authorization_attempts WHERE account_id=NEW.account_id AND command_id=NEW.command_id)
 OR EXISTS(SELECT 1 FROM drive_control_operations WHERE account_id=NEW.account_id AND command_id=NEW.command_id)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_target_insert_guard BEFORE INSERT ON drive_backup_targets
WHEN NEW.version != 1 OR NEW.state != 'unallocated'
 OR NOT EXISTS(SELECT 1 FROM originals WHERE id=NEW.original_id AND note_id=NEW.note_id)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_target_update_guard BEFORE UPDATE ON drive_backup_targets
WHEN (NEW.id IS NOT OLD.id OR NEW.original_id IS NOT OLD.original_id OR NEW.note_id IS NOT OLD.note_id
 OR NEW.account_id IS NOT OLD.account_id OR NEW.subject IS NOT OLD.subject OR NEW.marker IS NOT OLD.marker
 OR NEW.folder IS NOT OLD.folder OR NEW.folder_epoch IS NOT OLD.folder_epoch OR NEW.created_at IS NOT OLD.created_at
 OR NEW.version != OLD.version+1 OR NEW.updated_at < OLD.updated_at OR OLD.state='confirmed'
 OR (OLD.file_id IS NOT NULL AND NEW.file_id IS NOT OLD.file_id)) AND NOT coalesce((OLD.retention='usable' AND NEW.retention='recorder-deleted' AND EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.account_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running') AND NEW.id IS OLD.id AND NEW.original_id IS OLD.original_id AND NEW.note_id IS OLD.note_id AND NEW.account_id IS OLD.account_id AND NEW.folder_epoch IS OLD.folder_epoch AND NEW.state IS OLD.state AND NEW.version IS OLD.version AND NEW.created_at IS OLD.created_at AND NEW.updated_at IS OLD.updated_at AND NEW.redaction_version=1 AND NEW.subject IS NULL AND NEW.marker IS NULL AND NEW.folder IS NULL AND NEW.file_id IS NULL AND NOT EXISTS(SELECT 1 FROM drive_authorization_attempts x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='authorization' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_control_operations x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='control' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0 OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='backup' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN regeneration_source_attempts x ON x.binding_id=b.id WHERE (b.executor_id=OLD.account_id OR b.credential_owner_id=OLD.account_id) AND NOT coalesce(x.phase='terminal' AND (json_extract(x.completion,'$.kind')='never-owned' OR (x.owner_state='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE (u.account_id=OLD.account_id OR u.result_account_id=OLD.account_id) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1))
AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (w.note_id IN(SELECT id FROM notes WHERE owner_account_id=OLD.account_id AND owner_workspace_id IS NULL) OR w.owner_id IN(SELECT id FROM drive_backup_transfers WHERE account_id=OLD.account_id))) AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers WHERE target_id=OLD.id) AND NOT EXISTS(SELECT 1 FROM drive_backup_target_heads WHERE target_id=OLD.id) AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs WHERE target_id=OLD.id AND (terminal_at IS NULL OR admission_identity IS NOT NULL)) AND NOT EXISTS(SELECT 1 FROM drive_backup_records r JOIN regeneration_source_bindings b ON b.record_id=r.id WHERE r.target_id=OLD.id AND b.retention='usable')),0)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_job_insert_guard BEFORE INSERT ON drive_backup_jobs
WHEN NEW.version != 1
 OR NOT EXISTS(SELECT 1 FROM drive_backup_requests WHERE id=NEW.request_id AND account_id=NEW.account_id AND NEW.ordinal<count)
 OR (NEW.target_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM drive_backup_targets WHERE id=NEW.target_id AND account_id=NEW.account_id AND note_id IS NEW.note_id))
 OR (NEW.state='succeeded' AND NOT EXISTS(SELECT 1 FROM drive_backup_records WHERE id=NEW.record_id AND target_id IS NEW.target_id AND account_id=NEW.account_id AND note_id IS NEW.note_id AND bytes=NEW.bytes))
 OR (NEW.state='queued' AND NEW.bytes!=0)
 OR (NEW.terminal_at IS NOT NULL AND (NEW.terminal_at<NEW.created_at OR NEW.terminal_at>NEW.updated_at))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_job_update_guard BEFORE UPDATE ON drive_backup_jobs
WHEN (NEW.id IS NOT OLD.id OR NEW.request_id IS NOT OLD.request_id OR NEW.account_id IS NOT OLD.account_id
 OR NEW.ordinal IS NOT OLD.ordinal OR NEW.attempt IS NOT OLD.attempt OR NEW.created_at IS NOT OLD.created_at
 OR NOT coalesce(
   (OLD.terminal_at IS NULL AND NEW.version=OLD.version+1 AND NEW.updated_at>=OLD.updated_at
    AND NEW.note_id IS OLD.note_id AND NEW.target_id IS OLD.target_id AND NEW.retry_of IS OLD.retry_of AND NEW.title IS OLD.title
    AND NEW.bytes>=OLD.bytes AND (OLD.state='queued' OR NEW.state!='queued')
    AND (NEW.state!='queued' OR NEW.bytes=0)
    AND (NEW.terminal_at IS NULL OR NEW.terminal_at BETWEEN NEW.created_at AND NEW.updated_at)
    AND (NEW.state!='succeeded' OR EXISTS(SELECT 1 FROM drive_backup_records WHERE id=NEW.record_id AND target_id IS NEW.target_id AND account_id=NEW.account_id AND note_id IS NEW.note_id AND bytes=NEW.bytes)))
   OR
   (NEW.version=OLD.version AND NEW.updated_at IS OLD.updated_at AND NEW.state IS OLD.state
    AND NEW.terminal_at IS OLD.terminal_at AND NEW.bytes IS OLD.bytes AND NEW.failure IS OLD.failure AND NEW.record_id IS OLD.record_id
    AND NEW.note_id IS OLD.note_id AND NEW.target_id IS OLD.target_id AND NEW.title IS OLD.title
    AND OLD.retry_of IS NOT NULL AND NEW.retry_of IS NULL)
   OR
   (OLD.terminal_at IS NOT NULL AND NEW.version=OLD.version AND NEW.updated_at IS OLD.updated_at AND NEW.state IS OLD.state
    AND NEW.terminal_at IS OLD.terminal_at AND NEW.bytes IS OLD.bytes AND NEW.failure IS OLD.failure AND NEW.record_id IS OLD.record_id
    AND NEW.retry_of IS OLD.retry_of AND OLD.note_id IS NOT NULL AND NEW.note_id IS NULL AND NEW.target_id IS NULL AND NEW.title='削除済みノート'
    AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers WHERE note_id=OLD.note_id AND (phase NOT IN ('succeeded','failed','cancelled') OR owner_state IN ('active','unknown') OR read_pinned!=0 OR refresh_pending!=0)))
 ,0)) AND NOT coalesce((OLD.retention='usable' AND NEW.retention='recorder-deleted' AND EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.account_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running') AND NEW.id IS OLD.id AND NEW.request_id IS OLD.request_id AND NEW.account_id IS OLD.account_id AND NEW.ordinal IS OLD.ordinal AND NEW.attempt IS OLD.attempt AND NEW.retry_of IS OLD.retry_of AND NEW.note_id IS OLD.note_id AND NEW.target_id IS OLD.target_id AND NEW.title IS OLD.title AND NEW.version IS OLD.version AND NEW.created_at IS OLD.created_at AND NEW.updated_at IS OLD.updated_at AND NEW.terminal_at IS OLD.terminal_at AND NEW.state IS OLD.state AND NEW.bytes IS OLD.bytes AND NEW.failure IS OLD.failure AND NEW.record_id IS OLD.record_id AND NEW.root_ordinal IS OLD.root_ordinal AND NEW.redaction_version=1 AND NEW.admission_identity IS NULL AND OLD.terminal_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.job_id=OLD.id) AND NOT EXISTS(SELECT 1 FROM drive_authorization_attempts x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='authorization' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_control_operations x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='control' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0 OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='backup' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN regeneration_source_attempts x ON x.binding_id=b.id WHERE (b.executor_id=OLD.account_id OR b.credential_owner_id=OLD.account_id) AND NOT coalesce(x.phase='terminal' AND (json_extract(x.completion,'$.kind')='never-owned' OR (x.owner_state='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE (u.account_id=OLD.account_id OR u.result_account_id=OLD.account_id) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1))
AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (w.note_id IN(SELECT id FROM notes WHERE owner_account_id=OLD.account_id AND owner_workspace_id IS NULL) OR w.owner_id IN(SELECT id FROM drive_backup_transfers WHERE account_id=OLD.account_id)))),0)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_job_delete_guard BEFORE DELETE ON drive_backup_jobs
WHEN OLD.terminal_at IS NULL
 OR EXISTS(SELECT 1 FROM drive_backup_transfers WHERE job_id=OLD.id AND (phase NOT IN ('succeeded','failed','cancelled') OR owner_state IN ('active','unknown') OR read_pinned!=0 OR refresh_pending!=0))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_OWNER_ACTIVE'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_transfer_insert_guard BEFORE INSERT ON drive_backup_transfers
WHEN NEW.version!=1 OR NEW.phase!='queued' OR NEW.owner_state!='none' OR NEW.cancel_generation!=0
 OR NEW.received!=0 OR NEW.read_pinned!=0 OR NEW.refresh_pending!=0 OR NEW.status_attempts!=0 OR NEW.session_envelope IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM drive_backup_targets WHERE id=NEW.target_id AND note_id=NEW.note_id AND account_id=NEW.account_id
   AND original_id=json_extract(NEW.identity,'$.originalId') AND subject=json_extract(NEW.identity,'$.subject')
   AND json_extract(folder,'$.id') IS json_extract(NEW.identity,'$.folder.id')
   AND json_extract(folder,'$.driveId') IS json_extract(NEW.identity,'$.folder.driveId')
   AND json_extract(folder,'$.resourceKeyEnvelope') IS json_extract(NEW.identity,'$.folder.resourceKeyEnvelope'))
 OR NOT EXISTS(SELECT 1 FROM originals WHERE id=json_extract(NEW.identity,'$.originalId') AND note_id=NEW.note_id
   AND storage_key=json_extract(NEW.identity,'$.storageKey') AND bytes=json_extract(NEW.identity,'$.bytes') AND sha256=json_extract(NEW.identity,'$.sha256'))
 OR NOT EXISTS(SELECT 1 FROM drive_backup_jobs WHERE id=NEW.job_id AND target_id=NEW.target_id AND account_id=NEW.account_id AND note_id=NEW.note_id AND state='queued')
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_transfer_update_guard BEFORE UPDATE ON drive_backup_transfers
WHEN NEW.id IS NOT OLD.id OR NEW.target_id IS NOT OLD.target_id OR NEW.note_id IS NOT OLD.note_id
 OR NEW.account_id IS NOT OLD.account_id OR NEW.workspace_id IS NOT OLD.workspace_id OR NEW.epoch IS NOT OLD.epoch
 OR NEW.identity IS NOT OLD.identity OR NEW.created_at IS NOT OLD.created_at OR NEW.deadline_at IS NOT OLD.deadline_at
 OR NOT coalesce(
   (NEW.version=OLD.version+1 AND NEW.updated_at>=OLD.updated_at AND NEW.job_id IS OLD.job_id
    AND NEW.received>=OLD.received AND NEW.cancel_generation BETWEEN OLD.cancel_generation AND OLD.cancel_generation+1
    AND NEW.credential_version>=OLD.credential_version
    AND (NEW.phase!='succeeded' OR EXISTS(SELECT 1 FROM drive_backup_records WHERE id=NEW.record_id AND target_id=NEW.target_id AND note_id=NEW.note_id AND account_id=NEW.account_id AND bytes=NEW.received))
    AND (OLD.phase NOT IN ('succeeded','failed','cancelled') OR
      (NEW.phase IS OLD.phase AND NEW.received IS OLD.received AND NEW.session_envelope IS OLD.session_envelope
       AND NEW.status_attempts IS OLD.status_attempts AND NEW.offset IS OLD.offset AND NEW.length IS OLD.length
       AND NEW.record_id IS OLD.record_id AND NEW.failure IS OLD.failure AND NEW.credential_version IS OLD.credential_version))
    AND (OLD.owner_state!='none' OR NEW.owner_state IN ('none','active'))
    AND (OLD.owner_state NOT IN ('active','unknown') OR
      (NEW.runtime_generation IS OLD.runtime_generation AND NEW.owner_token IS OLD.owner_token AND NEW.owner_state IN ('active','unknown','closed')))
    AND (OLD.owner_state!='unknown' OR NEW.owner_state!='active')
    AND (OLD.owner_state!='closed' OR
      ((NEW.owner_state='closed' AND NEW.runtime_generation IS OLD.runtime_generation AND NEW.owner_token IS OLD.owner_token)
       OR (NEW.owner_state='active' AND OLD.phase NOT IN ('succeeded','failed','cancelled') AND (NEW.runtime_generation IS NOT OLD.runtime_generation OR NEW.owner_token IS NOT OLD.owner_token))))
    AND (OLD.read_pinned=0 OR NEW.read_pinned=1 OR NEW.owner_state='closed')
    AND (OLD.refresh_pending=0 OR NEW.refresh_pending=1 OR NEW.owner_state IN ('active','closed'))
    AND (OLD.refresh_pending=1 OR NEW.refresh_pending=0 OR
      (OLD.owner_state='active' AND NEW.owner_state='active' AND OLD.phase NOT IN ('succeeded','failed','cancelled') AND OLD.cancel_generation=0)))
   OR
   (OLD.phase IN ('succeeded','failed','cancelled') AND OLD.owner_state IN ('none','closed') AND OLD.read_pinned=0 AND OLD.refresh_pending=0
    AND OLD.job_id IS NOT NULL AND NEW.job_id IS NULL AND NEW.version IS OLD.version AND NEW.updated_at IS OLD.updated_at
    AND NEW.owner_state IS OLD.owner_state AND NEW.runtime_generation IS OLD.runtime_generation AND NEW.owner_token IS OLD.owner_token
    AND NEW.credential_version IS OLD.credential_version AND NEW.cancel_generation IS OLD.cancel_generation
    AND NEW.received IS OLD.received AND NEW.session_envelope IS OLD.session_envelope AND NEW.status_attempts IS OLD.status_attempts
    AND NEW.read_pinned IS OLD.read_pinned AND NEW.refresh_pending IS OLD.refresh_pending AND NEW.phase IS OLD.phase
    AND NEW.offset IS OLD.offset AND NEW.length IS OLD.length AND NEW.record_id IS OLD.record_id AND NEW.failure IS OLD.failure)
 ,0)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_transfer_claim_guard BEFORE UPDATE ON drive_backup_transfers
WHEN OLD.owner_state IN ('none','closed') AND NEW.owner_state='active'
 AND EXISTS(SELECT 1 FROM drive_backup_transfers WHERE id!=OLD.id AND owner_state IN ('active','unknown'))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_OWNER_ACTIVE'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_transfer_delete_guard BEFORE DELETE ON drive_backup_transfers
WHEN OLD.phase NOT IN ('succeeded','failed','cancelled') OR OLD.owner_state IN ('active','unknown') OR OLD.read_pinned!=0 OR OLD.refresh_pending!=0
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_OWNER_ACTIVE'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_record_insert_guard BEFORE INSERT ON drive_backup_records
WHEN NOT EXISTS(SELECT 1 FROM drive_backup_targets WHERE id=NEW.target_id AND state='confirmed'
  AND file_id=NEW.file_id AND original_id=NEW.original_id AND note_id=NEW.note_id AND account_id=NEW.account_id AND subject=NEW.subject
  AND json_extract(folder,'$.id') IS json_extract(NEW.folder,'$.id')
  AND json_extract(folder,'$.name') IS json_extract(NEW.folder,'$.name')
  AND json_extract(folder,'$.driveId') IS json_extract(NEW.folder,'$.driveId')
  AND json_extract(folder,'$.checkedAt') IS json_extract(NEW.folder,'$.checkedAt'))
 OR NOT EXISTS(SELECT 1 FROM originals WHERE id=NEW.original_id AND note_id=NEW.note_id AND bytes=NEW.bytes AND sha256=NEW.sha256)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_record_update_guard BEFORE UPDATE ON drive_backup_records
WHEN NOT coalesce((OLD.retention='usable' AND NEW.retention='recorder-deleted' AND EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.account_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running') AND NEW.id IS OLD.id AND NEW.version IS OLD.version AND NEW.target_id IS OLD.target_id AND NEW.note_id IS OLD.note_id AND NEW.original_id IS OLD.original_id AND NEW.account_id IS OLD.account_id AND NEW.bytes IS OLD.bytes AND NEW.sha256 IS OLD.sha256 AND NEW.created_at IS OLD.created_at AND NEW.redaction_version=1 AND NEW.subject IS NULL AND NEW.file_id IS NULL AND NEW.folder IS NULL AND NEW.web_view_link IS NULL AND NEW.resource_key_envelope IS NULL AND EXISTS(SELECT 1 FROM drive_backup_targets t WHERE t.id=OLD.target_id AND t.retention='recorder-deleted' AND t.deletion_id=NEW.deletion_id) AND NOT EXISTS(SELECT 1 FROM drive_authorization_attempts x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='authorization' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_control_operations x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='control' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0 OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='backup' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN regeneration_source_attempts x ON x.binding_id=b.id WHERE (b.executor_id=OLD.account_id OR b.credential_owner_id=OLD.account_id) AND NOT coalesce(x.phase='terminal' AND (json_extract(x.completion,'$.kind')='never-owned' OR (x.owner_state='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE (u.account_id=OLD.account_id OR u.result_account_id=OLD.account_id) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1))
AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (w.note_id IN(SELECT id FROM notes WHERE owner_account_id=OLD.account_id AND owner_workspace_id IS NULL) OR w.owner_id IN(SELECT id FROM drive_backup_transfers WHERE account_id=OLD.account_id)))),0)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_record_delete_guard BEFORE DELETE ON drive_backup_records
WHEN EXISTS(SELECT 1 FROM drive_backup_transfers WHERE target_id=OLD.target_id AND (phase NOT IN ('succeeded','failed','cancelled') OR owner_state IN ('active','unknown') OR read_pinned!=0 OR refresh_pending!=0))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_OWNER_ACTIVE'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_request_family_insert BEFORE INSERT ON drive_backup_requests
WHEN NEW.generation NOT BETWEEN 1 AND 9007199254740991
 OR (NEW.kind='bulk' AND NEW.root_request_id IS NULL AND NEW.bulk_summary IS NULL)
 OR (NEW.root_request_id IS NULL AND NEW.generation!=1)
 OR (NEW.root_request_id IS NOT NULL AND (
   NEW.kind!='bulk' OR NEW.bulk_summary IS NOT NULL OR NEW.root_request_id=NEW.id
   OR NOT EXISTS(SELECT 1 FROM drive_backup_requests r WHERE r.id=NEW.root_request_id AND r.account_id=NEW.account_id AND r.kind='bulk' AND r.root_request_id IS NULL AND r.bulk_summary IS NOT NULL AND NEW.generation=r.generation+1)))
 OR (NEW.bulk_summary IS NOT NULL AND NOT coalesce(NEW.kind='bulk' AND NEW.root_request_id IS NULL AND json_valid(NEW.bulk_summary)
   AND json_extract(NEW.bulk_summary,'$.version')=1 AND json_extract(NEW.bulk_summary,'$.selected') BETWEEN 1 AND 500
   AND json_extract(NEW.bulk_summary,'$.noOriginal') BETWEEN 0 AND 500
   AND json_extract(NEW.bulk_summary,'$.denied') BETWEEN 0 AND 500
   AND json_extract(NEW.bulk_summary,'$.processing') BETWEEN 0 AND 500
   AND json_extract(NEW.bulk_summary,'$.recorded') BETWEEN 0 AND 500
   AND json_extract(NEW.bulk_summary,'$.pending') BETWEEN 0 AND 500
   AND json_extract(NEW.bulk_summary,'$.selected')=json_extract(NEW.bulk_summary,'$.noOriginal')+json_extract(NEW.bulk_summary,'$.denied')+json_extract(NEW.bulk_summary,'$.processing')+json_extract(NEW.bulk_summary,'$.recorded')+json_extract(NEW.bulk_summary,'$.pending')
   AND NEW.count=json_extract(NEW.bulk_summary,'$.recorded')+json_extract(NEW.bulk_summary,'$.pending')
   AND length(json_extract(NEW.bulk_summary,'$.digest'))=64 AND json_extract(NEW.bulk_summary,'$.digest') NOT GLOB '*[^a-f0-9]*',0))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_request_update_guard BEFORE UPDATE ON drive_backup_requests
WHEN NEW.id IS NOT OLD.id OR NEW.account_id IS NOT OLD.account_id OR NEW.command_id IS NOT OLD.command_id
 OR NEW.intent_digest IS NOT OLD.intent_digest OR NEW.kind IS NOT OLD.kind OR NEW.count IS NOT OLD.count
 OR NEW.bulk_summary IS NOT OLD.bulk_summary OR NEW.root_request_id IS NOT OLD.root_request_id
 OR NEW.created_at IS NOT OLD.created_at OR NEW.version!=OLD.version+1
 OR NOT coalesce(
   (NEW.generation=OLD.generation AND OLD.cancelled_at IS NULL AND NEW.cancelled_at IS NOT NULL)
   OR (OLD.kind='bulk' AND OLD.root_request_id IS NULL AND OLD.bulk_summary IS NOT NULL
     AND NEW.generation=OLD.generation+1 AND NEW.cancelled_at IS NULL
     AND EXISTS(SELECT 1 FROM drive_backup_requests r JOIN drive_backup_jobs j ON j.request_id=r.id
       WHERE r.root_request_id=OLD.id AND r.generation=NEW.generation AND r.account_id=OLD.account_id)
     AND NOT EXISTS(SELECT 1 FROM drive_backup_requests r WHERE r.root_request_id=OLD.id AND r.generation=NEW.generation AND r.count!=(SELECT count(*) FROM drive_backup_jobs j WHERE j.request_id=r.id))
     AND NOT EXISTS(SELECT 1 FROM drive_backup_requests r JOIN drive_backup_jobs j ON j.request_id=r.id
       LEFT JOIN drive_backup_jobs p ON p.id=j.retry_of
       WHERE r.root_request_id=OLD.id AND r.generation=NEW.generation AND
         (p.id IS NULL OR p.state!='failed' OR p.account_id!=j.account_id OR p.target_id IS NOT j.target_id
          OR p.root_ordinal IS NOT j.root_ordinal OR j.attempt!=p.attempt+1
          OR EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.job_id=p.id AND (t.owner_state IN ('active','unknown') OR t.read_pinned!=0 OR t.refresh_pending!=0 OR t.phase NOT IN ('failed','cancelled'))))))
 ,0)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_job_admission_insert BEFORE INSERT ON drive_backup_jobs
WHEN (NEW.root_ordinal IS NOT NULL AND NEW.root_ordinal NOT BETWEEN 0 AND 499)
 OR (NEW.admission_identity IS NOT NULL AND NOT coalesce(json_valid(NEW.admission_identity)
   AND json_type(NEW.admission_identity)='object' AND (SELECT count(*) FROM json_each(NEW.admission_identity))=13
   AND json_type(NEW.admission_identity,'$.epoch')='integer' AND json_extract(NEW.admission_identity,'$.epoch') BETWEEN 1 AND 9007199254740991
   AND json_type(NEW.admission_identity,'$.settingsVersion')='integer' AND json_extract(NEW.admission_identity,'$.settingsVersion') BETWEEN 1 AND 9007199254740991
   AND json_type(NEW.admission_identity,'$.ownershipGeneration')='integer' AND json_extract(NEW.admission_identity,'$.ownershipGeneration') BETWEEN 1 AND 9007199254740991
   AND json_type(NEW.admission_identity,'$.workspaceId') IN ('text','null')
   AND json_type(NEW.admission_identity,'$.name')='text' AND length(json_extract(NEW.admission_identity,'$.name')) BETWEEN 1 AND 255
   AND json_type(NEW.admission_identity,'$.bytes')='integer' AND json_extract(NEW.admission_identity,'$.bytes') BETWEEN 1 AND 209715200
   AND json_type(NEW.admission_identity,'$.sha256')='text' AND length(json_extract(NEW.admission_identity,'$.sha256'))=64 AND json_extract(NEW.admission_identity,'$.sha256') NOT GLOB '*[^a-f0-9]*'
   AND json_type(NEW.admission_identity,'$.folder')='object' AND (SELECT count(*) FROM json_each(NEW.admission_identity,'$.folder'))=5
   AND json_type(NEW.admission_identity,'$.folder.name')='text' AND length(cast(json_extract(NEW.admission_identity,'$.folder.name') as blob)) BETWEEN 1 AND 4096
   AND json_type(NEW.admission_identity,'$.folder.id')='text' AND length(cast(json_extract(NEW.admission_identity,'$.folder.id') as blob)) BETWEEN 1 AND 1024
   AND json_type(NEW.admission_identity,'$.folder.driveId') IN ('text','null')
   AND json_type(NEW.admission_identity,'$.folder.resourceKeyEnvelope') IN ('text','null')
   AND json_type(NEW.admission_identity,'$.folder.checkedAt')='text' AND json_extract(NEW.admission_identity,'$.folder.checkedAt') GLOB '????-??-??T??:??:??*' AND julianday(json_extract(NEW.admission_identity,'$.folder.checkedAt')) IS NOT NULL
   AND NEW.target_id IS NOT NULL AND NEW.note_id IS NOT NULL
   AND json_extract(NEW.admission_identity,'$.noteId')=NEW.note_id
   AND json_extract(NEW.admission_identity,'$.accountId')=NEW.account_id
   AND EXISTS(SELECT 1 FROM drive_backup_targets t JOIN originals o ON o.id=t.original_id JOIN notes n ON n.id=t.note_id
     WHERE t.id=NEW.target_id AND t.note_id=NEW.note_id AND t.account_id=NEW.account_id
     AND json_extract(NEW.admission_identity,'$.originalId')=t.original_id
     AND json_extract(NEW.admission_identity,'$.subject')=t.subject
     AND json_extract(NEW.admission_identity,'$.workspaceId') IS n.owner_workspace_id
     AND json_extract(NEW.admission_identity,'$.ownershipGeneration')=n.ownership_generation
     AND json_extract(NEW.admission_identity,'$.folder.id')=json_extract(t.folder,'$.id')
     AND json_extract(NEW.admission_identity,'$.folder.driveId') IS json_extract(t.folder,'$.driveId')
     AND json_extract(NEW.admission_identity,'$.folder.resourceKeyEnvelope') IS json_extract(t.folder,'$.resourceKeyEnvelope')
     AND json_extract(NEW.admission_identity,'$.storageKey')=o.storage_key
     AND json_extract(NEW.admission_identity,'$.sha256')=o.sha256
     AND json_extract(NEW.admission_identity,'$.bytes')=o.bytes),0))
 OR EXISTS(SELECT 1 FROM drive_backup_requests r WHERE r.id=NEW.request_id AND (
   (r.kind IN ('automatic','bulk') AND NEW.admission_identity IS NULL)
   OR (r.kind='bulk' AND (NEW.root_ordinal IS NULL
     OR (r.root_request_id IS NULL AND NEW.root_ordinal!=NEW.ordinal)
     OR (r.root_request_id IS NOT NULL AND NOT EXISTS(
       SELECT 1 FROM drive_backup_jobs p JOIN drive_backup_requests pr ON pr.id=p.request_id
       WHERE p.id=NEW.retry_of AND p.state='failed' AND p.account_id=NEW.account_id
       AND coalesce(pr.root_request_id,pr.id)=r.root_request_id AND p.root_ordinal=NEW.root_ordinal
       AND p.target_id IS NEW.target_id AND NEW.attempt=p.attempt+1
       AND json_extract(p.admission_identity,'$.originalId') IS json_extract(NEW.admission_identity,'$.originalId')
       AND json_extract(p.admission_identity,'$.workspaceId') IS json_extract(NEW.admission_identity,'$.workspaceId')
       AND json_extract(p.admission_identity,'$.ownershipGeneration') IS json_extract(NEW.admission_identity,'$.ownershipGeneration')
       AND json_extract(p.admission_identity,'$.storageKey') IS json_extract(NEW.admission_identity,'$.storageKey')
       AND json_extract(p.admission_identity,'$.bytes') IS json_extract(NEW.admission_identity,'$.bytes')
       AND json_extract(p.admission_identity,'$.sha256') IS json_extract(NEW.admission_identity,'$.sha256')
       AND json_extract(p.admission_identity,'$.name') IS json_extract(NEW.admission_identity,'$.name')
       AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs newer JOIN drive_backup_requests nr ON nr.id=newer.request_id
         WHERE coalesce(nr.root_request_id,nr.id)=r.root_request_id AND newer.root_ordinal=p.root_ordinal
         AND (CASE WHEN nr.root_request_id IS NULL THEN 1 ELSE nr.generation END) > (CASE WHEN pr.root_request_id IS NULL THEN 1 ELSE pr.generation END)))))
   ) OR (r.kind!='bulk' AND NEW.root_ordinal IS NOT NULL)))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_request_retry_guard BEFORE UPDATE ON drive_backup_requests
WHEN NEW.generation>OLD.generation AND EXISTS(
  SELECT 1 FROM drive_backup_requests receipt JOIN drive_backup_jobs j ON j.request_id=receipt.id
  JOIN drive_backup_jobs p ON p.id=j.retry_of JOIN drive_backup_targets target ON target.id=p.target_id
  WHERE receipt.root_request_id=OLD.id AND receipt.generation=NEW.generation AND NOT coalesce(
    ((SELECT count(*) FROM drive_backup_transfers t WHERE t.job_id=p.id)=1
      AND EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.job_id=p.id AND t.owner_state='closed' AND t.read_pinned=0 AND t.refresh_pending=0 AND t.phase IN ('failed','cancelled')))
    OR (target.state='unallocated' AND target.file_id IS NULL
      AND (SELECT count(*) FROM drive_backup_transfers t WHERE t.job_id=p.id)<=1
      AND (p.admission_identity IS NOT NULL OR EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.job_id=p.id))
      AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.target_id=target.id AND NOT (
        t.owner_state='none' AND t.phase IN ('failed','cancelled') AND t.received=0 AND t.session_envelope IS NULL
        AND t.status_attempts=0 AND t.read_pinned=0 AND t.refresh_pending=0 AND t.offset IS NULL AND t.length IS NULL)))
  ,0))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_job_admission_update BEFORE UPDATE ON drive_backup_jobs
WHEN (NEW.root_ordinal IS NOT OLD.root_ordinal
 OR (NEW.admission_identity IS NOT OLD.admission_identity AND NOT coalesce(
   OLD.terminal_at IS NOT NULL AND NEW.admission_identity IS NULL AND NEW.note_id IS NULL AND NEW.target_id IS NULL
   AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.note_id=OLD.note_id AND (t.phase NOT IN ('succeeded','failed','cancelled') OR t.owner_state IN ('active','unknown') OR t.read_pinned!=0 OR t.refresh_pending!=0)),0))) AND NOT coalesce((OLD.retention='usable' AND NEW.retention='recorder-deleted' AND EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.account_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running') AND NEW.id IS OLD.id AND NEW.request_id IS OLD.request_id AND NEW.account_id IS OLD.account_id AND NEW.ordinal IS OLD.ordinal AND NEW.attempt IS OLD.attempt AND NEW.retry_of IS OLD.retry_of AND NEW.note_id IS OLD.note_id AND NEW.target_id IS OLD.target_id AND NEW.title IS OLD.title AND NEW.version IS OLD.version AND NEW.created_at IS OLD.created_at AND NEW.updated_at IS OLD.updated_at AND NEW.terminal_at IS OLD.terminal_at AND NEW.state IS OLD.state AND NEW.bytes IS OLD.bytes AND NEW.failure IS OLD.failure AND NEW.record_id IS OLD.record_id AND NEW.root_ordinal IS OLD.root_ordinal AND NEW.redaction_version=1 AND NEW.admission_identity IS NULL AND OLD.terminal_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.job_id=OLD.id) AND NOT EXISTS(SELECT 1 FROM drive_authorization_attempts x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='authorization' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_control_operations x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='control' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0 OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='backup' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN regeneration_source_attempts x ON x.binding_id=b.id WHERE (b.executor_id=OLD.account_id OR b.credential_owner_id=OLD.account_id) AND NOT coalesce(x.phase='terminal' AND (json_extract(x.completion,'$.kind')='never-owned' OR (x.owner_state='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE (u.account_id=OLD.account_id OR u.result_account_id=OLD.account_id) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1))
AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (w.note_id IN(SELECT id FROM notes WHERE owner_account_id=OLD.account_id AND owner_workspace_id IS NULL) OR w.owner_id IN(SELECT id FROM drive_backup_transfers WHERE account_id=OLD.account_id)))),0)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_head_insert BEFORE INSERT ON drive_backup_target_heads
WHEN NEW.version!=1 OR EXISTS(SELECT 1 FROM drive_backup_targets t WHERE t.original_id=NEW.original_id AND t.account_id=NEW.account_id AND t.subject=NEW.subject)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_head_update BEFORE UPDATE ON drive_backup_target_heads
WHEN NEW.original_id IS NOT OLD.original_id OR NEW.account_id IS NOT OLD.account_id OR NEW.subject IS NOT OLD.subject
 OR NEW.version!=OLD.version+1 OR NEW.target_id=OLD.target_id
 OR EXISTS(SELECT 1 FROM drive_backup_targets WHERE id=NEW.target_id)
 OR NOT EXISTS(SELECT 1 FROM drive_backup_targets WHERE id=OLD.target_id AND original_id=OLD.original_id AND account_id=OLD.account_id AND subject=OLD.subject)
 OR EXISTS(SELECT 1 FROM drive_backup_records r WHERE r.original_id=OLD.original_id AND r.account_id=OLD.account_id AND r.subject=OLD.subject)
 OR EXISTS(SELECT 1 FROM drive_backup_targets t WHERE t.original_id=OLD.original_id AND t.account_id=OLD.account_id AND t.subject=OLD.subject AND (
   t.state!='unallocated' OR t.file_id IS NOT NULL
   OR EXISTS(SELECT 1 FROM drive_backup_records r WHERE r.target_id=t.id)
   OR EXISTS(SELECT 1 FROM drive_backup_jobs j WHERE j.target_id=t.id AND NOT coalesce(
     j.state IN ('failed','cancelled') AND j.terminal_at IS NOT NULL AND j.bytes=0 AND j.account_id=t.account_id AND j.note_id=t.note_id
     AND (j.failure IS NULL OR j.failure NOT IN ('DRIVE_BACKUP_UNKNOWN','DRIVE_BACKUP_CONFLICT'))
     AND (SELECT count(*) FROM drive_backup_transfers x WHERE x.job_id=j.id)<=1
     AND (j.admission_identity IS NOT NULL OR EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.job_id=j.id))
     AND (j.admission_identity IS NULL OR (json_extract(j.admission_identity,'$.originalId')=t.original_id
       AND json_extract(j.admission_identity,'$.noteId')=t.note_id AND json_extract(j.admission_identity,'$.accountId')=t.account_id
       AND json_extract(j.admission_identity,'$.subject')=t.subject
       AND json_extract(j.admission_identity,'$.folder.id')=json_extract(t.folder,'$.id')
       AND json_extract(j.admission_identity,'$.folder.driveId') IS json_extract(t.folder,'$.driveId')
       AND json_extract(j.admission_identity,'$.folder.resourceKeyEnvelope') IS json_extract(t.folder,'$.resourceKeyEnvelope'))),0))
   OR EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE (x.target_id=t.id OR x.job_id IN (SELECT id FROM drive_backup_jobs WHERE target_id=t.id)) AND NOT coalesce(
     x.target_id=t.id AND x.note_id=t.note_id AND x.account_id=t.account_id
     AND json_extract(x.identity,'$.originalId')=t.original_id AND json_extract(x.identity,'$.subject')=t.subject
     AND json_extract(x.identity,'$.noteId')=t.note_id AND json_extract(x.identity,'$.accountId')=t.account_id
     AND json_extract(x.identity,'$.folder.id')=json_extract(t.folder,'$.id')
     AND json_extract(x.identity,'$.folder.driveId') IS json_extract(t.folder,'$.driveId')
     AND json_extract(x.identity,'$.folder.resourceKeyEnvelope') IS json_extract(t.folder,'$.resourceKeyEnvelope')
     AND (x.job_id IS NULL OR EXISTS(SELECT 1 FROM drive_backup_jobs j WHERE j.id=x.job_id AND j.target_id=t.id AND j.account_id=t.account_id AND j.note_id=t.note_id))
     AND x.phase IN ('failed','cancelled') AND x.received=0 AND x.session_envelope IS NULL AND x.status_attempts=0
     AND x.offset IS NULL AND x.length IS NULL AND x.read_pinned=0 AND x.refresh_pending=0
     AND (x.failure IS NULL OR x.failure NOT IN ('DRIVE_BACKUP_UNKNOWN','DRIVE_BACKUP_CONFLICT'))
     AND (x.owner_state='none' OR (x.owner_state='closed' AND x.phase='failed' AND x.failure IN ('DRIVE_BACKUP_FOLDER_TRASHED','DRIVE_BACKUP_FOLDER_UNAVAILABLE')))
     AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='drive-backup' AND w.owner_id=x.id AND w.active=1),0))
 ))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_head_delete BEFORE DELETE ON drive_backup_target_heads
WHEN (NOT EXISTS(SELECT 1 FROM drive_backup_targets t JOIN notes n ON n.id=t.note_id WHERE t.id=OLD.target_id AND n.lifecycle='purging'
 AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs j WHERE j.note_id=n.id AND j.terminal_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.note_id=n.id AND (x.phase NOT IN ('failed','cancelled','succeeded') OR x.owner_state IN ('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0))
 AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.kind='drive-backup' AND w.active=1 AND w.owner_id IN (SELECT id FROM drive_backup_transfers WHERE note_id=n.id)))) AND NOT coalesce((EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id JOIN drive_backup_targets t ON t.account_id=a.id WHERE t.id=OLD.target_id AND a.state='deleted' AND a.deletion_id=d.id AND d.state='running' AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.target_id=t.id) AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs j WHERE j.target_id=t.id AND (j.terminal_at IS NULL OR j.admission_identity IS NOT NULL)) AND NOT EXISTS(SELECT 1 FROM drive_authorization_attempts x WHERE x.account_id=a.id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='authorization' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_control_operations x WHERE x.account_id=a.id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='control' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.account_id=a.id AND (x.owner_state IN('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0 OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='backup' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN regeneration_source_attempts x ON x.binding_id=b.id WHERE (b.executor_id=a.id OR b.credential_owner_id=a.id) AND NOT coalesce(x.phase='terminal' AND (json_extract(x.completion,'$.kind')='never-owned' OR (x.owner_state='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE (u.account_id=a.id OR u.result_account_id=a.id) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1))
AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (w.note_id IN(SELECT id FROM notes WHERE owner_account_id=a.id AND owner_workspace_id IS NULL) OR w.owner_id IN(SELECT id FROM drive_backup_transfers WHERE account_id=a.id))))),0)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_OWNER_ACTIVE'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_target_head_insert BEFORE INSERT ON drive_backup_targets
WHEN NEW.file_id IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM drive_backup_target_heads h WHERE h.target_id=NEW.id AND h.original_id=NEW.original_id AND h.account_id=NEW.account_id AND h.subject=NEW.subject)
 OR NOT EXISTS(SELECT 1 FROM drive_connections d WHERE d.account_id=NEW.account_id AND d.state IN ('linked','needs-relink') AND d.epoch=NEW.folder_epoch
   AND json_extract(d.credential,'$.subject')=NEW.subject
   AND json_extract(d.folder,'$.id')=json_extract(NEW.folder,'$.id')
   AND json_extract(d.folder,'$.driveId') IS json_extract(NEW.folder,'$.driveId')
   AND json_extract(d.folder,'$.resourceKeyEnvelope') IS json_extract(NEW.folder,'$.resourceKeyEnvelope'))
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_target_head_update BEFORE UPDATE ON drive_backup_targets
WHEN (NOT EXISTS(SELECT 1 FROM drive_backup_target_heads WHERE target_id=OLD.id)) AND NOT coalesce((OLD.retention='usable' AND NEW.retention='recorder-deleted' AND EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.account_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running') AND NEW.id IS OLD.id AND NEW.original_id IS OLD.original_id AND NEW.note_id IS OLD.note_id AND NEW.account_id IS OLD.account_id AND NEW.folder_epoch IS OLD.folder_epoch AND NEW.state IS OLD.state AND NEW.version IS OLD.version AND NEW.created_at IS OLD.created_at AND NEW.updated_at IS OLD.updated_at AND NEW.redaction_version=1 AND NEW.subject IS NULL AND NEW.marker IS NULL AND NEW.folder IS NULL AND NEW.file_id IS NULL AND NOT EXISTS(SELECT 1 FROM drive_authorization_attempts x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='authorization' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_control_operations x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='control' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0 OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='backup' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN regeneration_source_attempts x ON x.binding_id=b.id WHERE (b.executor_id=OLD.account_id OR b.credential_owner_id=OLD.account_id) AND NOT coalesce(x.phase='terminal' AND (json_extract(x.completion,'$.kind')='never-owned' OR (x.owner_state='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE (u.account_id=OLD.account_id OR u.result_account_id=OLD.account_id) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1))
AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (w.note_id IN(SELECT id FROM notes WHERE owner_account_id=OLD.account_id AND owner_workspace_id IS NULL) OR w.owner_id IN(SELECT id FROM drive_backup_transfers WHERE account_id=OLD.account_id))) AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers WHERE target_id=OLD.id) AND NOT EXISTS(SELECT 1 FROM drive_backup_target_heads WHERE target_id=OLD.id) AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs WHERE target_id=OLD.id AND (terminal_at IS NULL OR admission_identity IS NOT NULL)) AND NOT EXISTS(SELECT 1 FROM drive_backup_records r JOIN regeneration_source_bindings b ON b.record_id=r.id WHERE r.target_id=OLD.id AND b.retention='usable')),0)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_job_head_insert BEFORE INSERT ON drive_backup_jobs
WHEN NEW.target_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM drive_backup_target_heads WHERE target_id=NEW.target_id)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_transfer_head_insert BEFORE INSERT ON drive_backup_transfers
WHEN NOT EXISTS(SELECT 1 FROM drive_backup_target_heads WHERE target_id=NEW.target_id)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_transfer_head_update BEFORE UPDATE ON drive_backup_transfers
WHEN NOT EXISTS(SELECT 1 FROM drive_backup_target_heads WHERE target_id=NEW.target_id)
 AND (NEW.phase NOT IN ('failed','cancelled') OR (OLD.owner_state IN ('none','closed') AND NEW.owner_state='active') OR NEW.read_pinned>OLD.read_pinned OR NEW.refresh_pending>OLD.refresh_pending OR NEW.received>OLD.received OR NEW.session_envelope IS NOT OLD.session_envelope)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_record_head_insert BEFORE INSERT ON drive_backup_records
WHEN NOT EXISTS(SELECT 1 FROM drive_backup_target_heads WHERE target_id=NEW.target_id)
BEGIN SELECT RAISE(ABORT,'DRIVE_BACKUP_STATE_INVALID'); END;
--> statement-breakpoint
CREATE TRIGGER llm_conversion_identity BEFORE UPDATE ON llm_conversions
WHEN NEW.job_id != OLD.job_id OR NEW.account_id != OLD.account_id OR NEW.note_id != OLD.note_id
 OR NEW.original_id != OLD.original_id OR NEW.command_id != OLD.command_id OR NEW.request_digest != OLD.request_digest
 OR NEW.operation != OLD.operation OR NEW.retry_of IS NOT OLD.retry_of
 OR NEW.source_sha256 != OLD.source_sha256 OR NEW.source_bytes != OLD.source_bytes OR NEW.source_format != OLD.source_format
 OR NEW.source_state != OLD.source_state OR NEW.source_coverage != OLD.source_coverage
 OR NEW.note_version != OLD.note_version OR NEW.original_revision_no IS NOT OLD.original_revision_no
 OR NEW.credential_epoch != OLD.credential_epoch OR NEW.instruction != OLD.instruction
 OR NEW.admission_sequence != OLD.admission_sequence
 OR NEW.source_ownership_generation IS NOT OLD.source_ownership_generation
 OR NEW.created_at != OLD.created_at OR NEW.deadline_at != OLD.deadline_at
 OR NEW.version != OLD.version + 1 OR NEW.cancel_generation < OLD.cancel_generation
 OR (OLD.phase='terminal' AND NEW.phase!='terminal')
 OR (OLD.owner_state IN ('active','unknown') AND (NEW.runtime_id IS NOT OLD.runtime_id OR NEW.owner_token IS NOT OLD.owner_token))
 OR (OLD.owner_state='unknown' AND NEW.owner_state NOT IN ('unknown','closed'))
 OR (OLD.owner_state='closed' AND NEW.owner_state='active' AND OLD.phase!='response-ready')
 OR (OLD.owner_state IN ('active','unknown') AND NEW.owner_state='idle')
 OR (NEW.response_budget < OLD.response_budget AND NEW.owner_state IN ('active','unknown'))
 OR ((NEW.selection_state IS NOT OLD.selection_state OR NEW.model_id IS NOT OLD.model_id
 OR NEW.preparation_version IS NOT OLD.preparation_version OR NEW.prompt_version IS NOT OLD.prompt_version
 OR NEW.candidate_text_model_id IS NOT OLD.candidate_text_model_id OR NEW.candidate_image_model_id IS NOT OLD.candidate_image_model_id
 OR NEW.candidate_settings_version IS NOT OLD.candidate_settings_version OR NEW.pdf_selection_manifest IS NOT OLD.pdf_selection_manifest)
 AND NOT coalesce((OLD.selection_state='pdf-pending' AND NEW.selection_state='fixed'
 AND OLD.phase='classifying' AND NEW.phase='preparing' AND OLD.outcome='pending' AND NEW.outcome='pending'
 AND OLD.owner_state='active' AND NEW.owner_state='active' AND NEW.runtime_id=OLD.runtime_id AND NEW.owner_token=OLD.owner_token
 AND OLD.cancel_generation=0 AND NEW.cancel_generation=0 AND NEW.updated_at<OLD.deadline_at
 AND NEW.model_id=CASE json_extract(NEW.pdf_selection_manifest,'$.kind') WHEN 'strict-text' THEN OLD.candidate_text_model_id WHEN 'pages' THEN OLD.candidate_image_model_id END
 AND NOT EXISTS(SELECT 1 FROM llm_dispatches WHERE job_id=OLD.job_id)
 AND EXISTS(SELECT 1 FROM notes n JOIN originals o ON o.note_id=n.id JOIN openrouter_connections k ON k.account_id=OLD.account_id
 WHERE n.id=OLD.note_id AND n.version=OLD.note_version AND n.ownership_generation=OLD.source_ownership_generation
 AND o.id=OLD.original_id AND o.sha256=OLD.source_sha256 AND o.bytes=OLD.source_bytes
 AND k.state='linked' AND k.epoch=OLD.credential_epoch)),0))
BEGIN SELECT RAISE(ABORT,'llm_conversion_identity'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_preview_identity BEFORE UPDATE ON llm_pdf_previews
WHEN NEW.id!=OLD.id OR NEW.account_id!=OLD.account_id OR NEW.command_id!=OLD.command_id OR NEW.request_digest!=OLD.request_digest
 OR NEW.note_id!=OLD.note_id OR NEW.note_version!=OLD.note_version OR NEW.ownership_generation!=OLD.ownership_generation
 OR NEW.original_id!=OLD.original_id OR NEW.source_sha256!=OLD.source_sha256 OR NEW.source_bytes!=OLD.source_bytes
 OR NEW.credential_epoch!=OLD.credential_epoch OR NEW.policy_version!=OLD.policy_version
 OR NEW.created_at!=OLD.created_at OR NEW.expires_at!=OLD.expires_at
 OR NEW.version!=OLD.version+1 OR NEW.cancel_generation<OLD.cancel_generation
 OR (OLD.owner_state IN ('active','unknown') AND (NEW.runtime_id IS NOT OLD.runtime_id OR NEW.owner_token IS NOT OLD.owner_token))
 OR (OLD.owner_state='unknown' AND NEW.owner_state NOT IN ('unknown','closed'))
 OR (OLD.owner_state IN ('active','unknown') AND NEW.owner_state='idle')
 OR (OLD.owner_state='closed' AND NEW.owner_state!='closed')
 OR (OLD.state='ready' AND NEW.state='ready' AND NEW.result_json IS NOT OLD.result_json)
 OR (OLD.state='consumed' AND NEW.consumed_job_id IS NOT OLD.consumed_job_id)
 OR NOT (
 (OLD.state='queued' AND NEW.state IN ('queued','running','failed','cancelled','expired'))
 OR (OLD.state='running' AND NEW.state IN ('running','ready','failed','cancelled','expired','unknown'))
 OR (OLD.state='unknown' AND NEW.state IN ('unknown','failed','cancelled','expired'))
 OR (OLD.state='ready' AND NEW.state IN ('ready','consumed','failed','cancelled','expired'))
 OR (OLD.state IN ('consumed','failed','cancelled','expired') AND NEW.state=OLD.state)
 )
BEGIN SELECT RAISE(ABORT,'llm_pdf_preview_identity'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_preview_ready BEFORE UPDATE ON llm_pdf_previews
WHEN NEW.state='ready' AND (NEW.updated_at>=NEW.expires_at OR NOT EXISTS (
 SELECT 1 FROM notes n JOIN originals o ON o.note_id=n.id JOIN openrouter_connections k ON k.account_id=NEW.account_id
 WHERE n.id=NEW.note_id AND n.version=NEW.note_version AND n.ownership_generation=NEW.ownership_generation
 AND o.id=NEW.original_id AND o.sha256=NEW.source_sha256 AND o.bytes=NEW.source_bytes
 AND k.state='linked' AND k.epoch=NEW.credential_epoch
))
BEGIN SELECT RAISE(ABORT,'llm_pdf_preview_changed'); END;
--> statement-breakpoint
CREATE TRIGGER regeneration_binding_insert BEFORE INSERT ON regeneration_source_bindings
WHEN NEW.version!=1 OR NEW.cancel_generation!=0 OR NOT EXISTS(
 SELECT 1 FROM drive_backup_records r JOIN originals o ON o.id=r.original_id
 WHERE r.id=NEW.record_id AND r.account_id=NEW.credential_owner_id AND r.subject=NEW.subject
 AND r.note_id=NEW.note_id AND r.original_id=NEW.original_id AND o.note_id=NEW.note_id AND o.sha256=r.sha256 AND o.bytes=r.bytes)
BEGIN SELECT RAISE(ABORT,'regeneration_binding_invalid'); END;
--> statement-breakpoint
CREATE TRIGGER regeneration_binding_update BEFORE UPDATE ON regeneration_source_bindings
WHEN (NEW.id!=OLD.id OR NEW.record_id!=OLD.record_id OR NEW.executor_id!=OLD.executor_id OR NEW.credential_owner_id!=OLD.credential_owner_id
 OR NEW.note_id!=OLD.note_id OR NEW.original_id!=OLD.original_id OR NEW.subject!=OLD.subject OR NEW.drive_epoch!=OLD.drive_epoch
 OR NEW.ownership_generation!=OLD.ownership_generation OR NEW.fingerprint!=OLD.fingerprint OR NEW.created_at!=OLD.created_at
 OR NEW.llm_job_id IS NOT OLD.llm_job_id OR NEW.preview_id IS NOT OLD.preview_id OR NEW.machine_request_id IS NOT OLD.machine_request_id
 OR NEW.version!=OLD.version+1 OR NEW.cancel_generation<OLD.cancel_generation) AND NOT coalesce((OLD.retention='usable' AND NEW.retention='recorder-deleted' AND (EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.executor_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running') OR EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.credential_owner_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running')) AND NEW.id IS OLD.id AND NEW.record_id IS OLD.record_id AND NEW.executor_id IS OLD.executor_id AND NEW.credential_owner_id IS OLD.credential_owner_id AND NEW.note_id IS OLD.note_id AND NEW.original_id IS OLD.original_id AND NEW.drive_epoch IS OLD.drive_epoch AND NEW.ownership_generation IS OLD.ownership_generation AND NEW.fingerprint IS OLD.fingerprint AND NEW.llm_job_id IS OLD.llm_job_id AND NEW.preview_id IS OLD.preview_id AND NEW.machine_request_id IS OLD.machine_request_id AND NEW.cancel_generation IS OLD.cancel_generation AND NEW.created_at IS OLD.created_at AND NEW.version=OLD.version+1 AND NEW.redaction_version=1 AND NEW.subject IS NULL AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts a WHERE a.binding_id=OLD.id AND NOT coalesce(a.phase='terminal' AND (json_extract(a.completion,'$.kind')='never-owned' OR (a.owner_state='closed' AND json_extract(a.completion,'$.callerEnded')=1 AND json_extract(a.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM llm_conversions c WHERE c.source_binding_id=OLD.id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed')))
AND NOT EXISTS(SELECT 1 FROM llm_pdf_previews c WHERE c.source_binding_id=OLD.id AND (c.state='running' OR c.owner_state IN('active','unknown') OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed')))
AND NOT EXISTS(SELECT 1 FROM machine_regenerations c WHERE c.source_binding_id=OLD.id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed')))),0)
BEGIN SELECT RAISE(ABORT,'regeneration_binding_immutable'); END;
--> statement-breakpoint
CREATE TRIGGER regeneration_attempt_insert BEFORE INSERT ON regeneration_source_attempts
WHEN NEW.phase!='queued' OR NEW.owner_state!='none' OR NEW.version!=1 OR NEW.cancel_generation!=0
 OR NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b WHERE b.id=NEW.binding_id AND b.cancel_generation=0)
 OR NEW.ordinal!=(SELECT coalesce(max(ordinal),0)+1 FROM regeneration_source_attempts WHERE binding_id=NEW.binding_id)
BEGIN SELECT RAISE(ABORT,'regeneration_attempt_invalid'); END;
--> statement-breakpoint
CREATE TRIGGER regeneration_attempt_update BEFORE UPDATE ON regeneration_source_attempts
WHEN NEW.id!=OLD.id OR NEW.binding_id!=OLD.binding_id OR NEW.ordinal!=OLD.ordinal OR NEW.purpose!=OLD.purpose
 OR NEW.deadline_at!=OLD.deadline_at OR NEW.created_at!=OLD.created_at OR NEW.version!=OLD.version+1 OR NEW.cancel_generation<OLD.cancel_generation
 OR NEW.credential_version<OLD.credential_version
 OR (OLD.owner_state!='none' AND (NEW.runtime_id IS NOT OLD.runtime_id OR NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state='none'))
 OR (OLD.phase='terminal' AND (NEW.phase!='terminal' OR NEW.owner_state!=OLD.owner_state))
 OR (OLD.phase='unknown' AND NEW.phase NOT IN('unknown','terminal'))
 OR (OLD.phase='terminal' AND (json_extract(NEW.completion,'$.kind') IS NOT json_extract(OLD.completion,'$.kind') OR json_extract(NEW.completion,'$.outcome') IS NOT json_extract(OLD.completion,'$.outcome') OR json_extract(NEW.completion,'$.proofId') IS NOT json_extract(OLD.completion,'$.proofId') OR json_extract(NEW.completion,'$.digest') IS NOT json_extract(OLD.completion,'$.digest') OR json_extract(NEW.completion,'$.failure') IS NOT json_extract(OLD.completion,'$.failure')))
 OR (OLD.owner_state='closed' AND NEW.owner_state!='closed')
 OR (json_extract(OLD.completion,'$.acknowledged')=1 AND NEW.completion IS NOT OLD.completion)
 OR (json_extract(OLD.completion,'$.callerEnded')=1 AND coalesce(json_extract(NEW.completion,'$.callerEnded'),0)!=1)
BEGIN SELECT RAISE(ABORT,'regeneration_attempt_changed'); END;
--> statement-breakpoint
CREATE TRIGGER regeneration_attempt_delete BEFORE DELETE ON regeneration_source_attempts WHEN NOT coalesce(OLD.phase='terminal' AND (json_extract(OLD.completion,'$.kind')='never-owned' OR (OLD.owner_state='closed' AND json_extract(OLD.completion,'$.callerEnded')=1 AND json_extract(OLD.completion,'$.acknowledged')=1)),0) BEGIN SELECT RAISE(ABORT,'regeneration_attempt_owned'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regeneration_insert BEFORE INSERT ON machine_regenerations
WHEN NEW.phase!='queued' OR NEW.outcome!='pending' OR NEW.owner_state!='none' OR NEW.version!=1 OR NEW.cancel_generation!=0
BEGIN SELECT RAISE(ABORT,'machine_regeneration_invalid'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regeneration_update BEFORE UPDATE ON machine_regenerations
WHEN NEW.id!=OLD.id OR NEW.executor_id!=OLD.executor_id OR NEW.note_id!=OLD.note_id OR NEW.original_id!=OLD.original_id
 OR NEW.command_id!=OLD.command_id OR NEW.request_digest!=OLD.request_digest OR NEW.source!=OLD.source OR NEW.previous!=OLD.previous
 OR NEW.note_version!=OLD.note_version OR NEW.ownership_generation!=OLD.ownership_generation OR NEW.original_revision_no!=OLD.original_revision_no
 OR NEW.created_at!=OLD.created_at OR NEW.deadline_at!=OLD.deadline_at OR NEW.version!=OLD.version+1 OR NEW.cancel_generation<OLD.cancel_generation
 OR (OLD.phase='terminal' AND NEW.phase!='terminal')
 OR (OLD.terminal_at IS NOT NULL AND NEW.terminal_at IS NOT OLD.terminal_at)
 OR (OLD.owner_state!='none' AND (NEW.runtime_id IS NOT OLD.runtime_id OR NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state='none'))
 OR (OLD.owner_state='unknown' AND NEW.owner_state NOT IN('unknown','closed'))
 OR (OLD.owner_state='closed' AND NEW.owner_state!='closed')
BEGIN SELECT RAISE(ABORT,'machine_regeneration_changed'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regeneration_delete BEFORE DELETE ON machine_regenerations
WHEN (OLD.phase!='terminal' OR OLD.outcome='unknown' OR OLD.owner_state IN('active','unknown')) AND NOT coalesce((EXISTS(SELECT 1 FROM notes n
 JOIN note_purges p ON p.id=n.trash_operation_id AND p.note_id=n.id
 JOIN account_deletion_purges ap ON ap.purge_id=p.id AND ap.note_id=n.id AND ap.intent_id=p.account_deletion_id
 JOIN account_deletions d ON d.id=ap.intent_id
 JOIN accounts a ON a.id=d.account_id
 WHERE n.id=OLD.note_id AND n.owner_workspace_id IS NULL AND n.owner_account_id=d.account_id
 AND n.lifecycle='purging' AND p.cause='account-deletion' AND p.operation_id=d.id
 AND p.deleted_account_id=d.account_id AND p.account_id IS NULL AND p.workspace_id IS NULL AND p.workspace_deletion_id IS NULL
 AND p.state='running' AND p.lease_token IS NOT NULL AND p.lease_until>p.updated_at
 AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state!='succeeded')
 AND OLD.phase='terminal' AND OLD.outcome='unknown' AND OLD.owner_state='closed'
 AND OLD.runtime_id IS NOT NULL AND OLD.owner_token IS NOT NULL AND OLD.source_memory_bytes=0
 AND OLD.source_input_receipt IS NOT NULL AND json_valid(OLD.source_input_receipt)
 AND json_extract(OLD.source_input_receipt,'$.state')='closed'
 AND json_extract(OLD.source_input_receipt,'$.runtimeId')=OLD.runtime_id
 AND json_extract(OLD.source_input_receipt,'$.token')=OLD.owner_token
 AND json_type(OLD.source_input_receipt,'$.generation')='integer'
 AND json_extract(OLD.source_input_receipt,'$.generation') BETWEEN 1 AND 9007199254740991
 AND json_type(OLD.source_input_receipt,'$.proofId')='text' AND length(json_extract(OLD.source_input_receipt,'$.proofId'))=36
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts x JOIN regeneration_source_bindings b ON b.id=x.binding_id WHERE b.note_id=OLD.note_id AND NOT coalesce(x.phase='terminal' AND ((x.owner_state='none' AND x.cancel_generation>0 AND json_extract(x.completion,'$.kind')='never-owned' AND json_extract(x.completion,'$.outcome')='cancelled') OR (x.owner_state='closed' AND json_extract(x.completion,'$.kind')='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
 AND NOT EXISTS(SELECT 1 FROM machine_regenerations m WHERE m.note_id=OLD.note_id AND (m.phase!='terminal' OR m.owner_state IN('active','unknown') OR m.source_memory_bytes!=0 OR (m.source_input_receipt IS NOT NULL AND json_extract(m.source_input_receipt,'$.state')!='closed')))
 AND NOT EXISTS(SELECT 1 FROM llm_conversions c WHERE c.note_id=OLD.note_id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.response_budget!=0 OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed') OR EXISTS(SELECT 1 FROM llm_quota_reservations q WHERE q.job_id=c.job_id AND q.state='reserved')))
 AND NOT EXISTS(SELECT 1 FROM llm_pdf_previews x WHERE x.note_id=OLD.note_id AND (x.state IN('queued','running','unknown') OR x.owner_state IN('active','unknown') OR x.source_memory_bytes!=0 OR (x.source_input_receipt IS NOT NULL AND json_extract(x.source_input_receipt,'$.state')!='closed')))
 AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs j WHERE j.note_id=OLD.note_id AND j.terminal_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.note_id=OLD.note_id AND (t.owner_state IN('active','unknown') OR t.phase NOT IN('succeeded','failed','cancelled') OR t.read_pinned!=0 OR t.refresh_pending!=0 OR (t.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments ack WHERE ack.kind='backup' AND ack.id=t.id AND ack.runtime_generation=t.runtime_generation AND ack.owner_token=t.owner_token))))
 AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (
 w.note_id=OLD.note_id OR
 (w.kind='media-upload' AND EXISTS(SELECT 1 FROM media_uploads u JOIN media_drafts md ON md.id=u.draft_id WHERE u.id=w.owner_id AND md.note_id=OLD.note_id)) OR
 (w.kind='reference-job' AND EXISTS(SELECT 1 FROM reference_jobs j WHERE j.id=w.owner_id AND (j.note_id=OLD.note_id OR EXISTS(SELECT 1 FROM reference_settings rs JOIN reference_settings own ON own.bundle_id=rs.bundle_id WHERE rs.note_id=j.note_id AND own.note_id=OLD.note_id)))) OR
 (w.kind='conversion-job' AND EXISTS(SELECT 1 FROM conversion_jobs j WHERE j.id=w.owner_id AND j.note_id=OLD.note_id)) OR
 (w.kind='llm-pdf-preview' AND EXISTS(SELECT 1 FROM llm_pdf_previews v WHERE v.id=w.owner_id AND v.note_id=OLD.note_id)) OR
 (w.kind='drive-backup' AND EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.id=w.owner_id AND t.note_id=OLD.note_id)) OR
 (w.kind='export-operation' AND EXISTS(SELECT 1 FROM export_operations e WHERE e.id=w.owner_id AND e.note_id=OLD.note_id)) OR
 (w.kind='pdf-artifact' AND EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='pdf-delivery' AND EXISTS(SELECT 1 FROM pdf_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE v.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='pdf-anonymous-delivery' AND EXISTS(SELECT 1 FROM pdf_anonymous_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE v.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='zip-source' AND EXISTS(SELECT 1 FROM zip_attempts v JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-spool' AND EXISTS(SELECT 1 FROM zip_spools z JOIN zip_attempts v ON v.id=z.attempt_id JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE z.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-assembly' AND EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-delivery' AND EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE v.id=w.owner_id AND e.live_note_id=OLD.note_id)) OR
 (w.kind='import-upload' AND EXISTS(SELECT 1 FROM upload_reservations u JOIN originals o ON o.storage_key=u.storage_key WHERE u.id=w.owner_id AND o.note_id=OLD.note_id))))
 AND NOT EXISTS(SELECT 1 FROM pdf_computations c WHERE c.live_note_id=OLD.note_id AND (c.state!='closed' OR c.workspace_removed=0))
 AND NOT EXISTS(SELECT 1 FROM pdf_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE a.live_note_id=OLD.note_id AND v.state!='closed')
 AND NOT EXISTS(SELECT 1 FROM pdf_anonymous_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE a.live_note_id=OLD.note_id AND v.state!='closed')
 AND NOT EXISTS(SELECT 1 FROM zip_targets t JOIN zip_requests q ON q.id=t.request_id WHERE t.live_note_id=OLD.note_id AND q.state!='terminal')
 AND NOT EXISTS(SELECT 1 FROM zip_pdf_holds h JOIN pdf_artifacts a ON a.id=h.artifact_id WHERE a.live_note_id=OLD.note_id AND h.state!='released')
 AND NOT EXISTS(SELECT 1 FROM zip_spool_refs f JOIN zip_targets t ON t.request_id=f.request_id AND t.ordinal=f.ordinal WHERE t.live_note_id=OLD.note_id)
 AND NOT EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE t.live_note_id=OLD.note_id AND (v.state!='closed' OR v.storage_key IS NOT NULL))
 AND NOT EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE e.live_note_id=OLD.note_id AND v.state!='closed')
 AND json_extract(OLD.source_input_receipt,'$.consumer.kind')='machine-regeneration' AND json_extract(OLD.source_input_receipt,'$.consumer.id')=OLD.id),0)
BEGIN SELECT RAISE(ABORT,'machine_regeneration_owned'); END;
--> statement-breakpoint
CREATE TRIGGER llm_conversions_source_insert BEFORE INSERT ON llm_conversions WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.llm_job_id=NEW.job_id AND b.executor_id=NEW.account_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=NEW.source_sha256 AND r.bytes=NEW.source_bytes AND o.format=NEW.source_format)))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR NEW.source_origin='redacted' OR NEW.source_memory_bytes!=0
 OR NEW.source_input_receipt IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'regeneration_source_invalid'); END;
--> statement-breakpoint
CREATE TRIGGER llm_conversions_source_update BEFORE UPDATE ON llm_conversions WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.llm_job_id=NEW.job_id AND b.executor_id=NEW.account_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=NEW.source_sha256 AND r.bytes=NEW.source_bytes AND o.format=NEW.source_format)))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR (NEW.source_origin='redacted' AND NOT coalesce((NEW.phase='terminal' AND NEW.outcome!='unknown') AND NEW.owner_state IN('idle','closed') AND NEW.source_memory_bytes=0,0))
 OR ((NEW.source_origin IS NOT OLD.source_origin OR NEW.source_binding_id IS NOT OLD.source_binding_id)
 AND NOT coalesce(OLD.source_origin='drive-record' AND NEW.source_origin='redacted' AND (NEW.phase='terminal' AND NEW.outcome!='unknown') AND NEW.owner_state IN('idle','closed') AND NEW.source_memory_bytes=0
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes<OLD.source_memory_bytes AND NOT coalesce(((OLD.source_input_receipt IS NULL AND NEW.source_input_receipt IS NULL AND NEW.owner_state='closed') OR (OLD.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND OLD.owner_state!='unknown' AND NEW.owner_state!='unknown'))
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes>OLD.source_memory_bytes AND NOT coalesce(
 NEW.source_origin!='redacted' AND NEW.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.state')='active' AND NEW.owner_state='active' AND NEW.runtime_id IS NOT NULL AND NEW.owner_token IS NOT NULL
 AND NEW.cancel_generation=0 AND (NEW.phase!='terminal' AND NEW.outcome='pending')
 AND EXISTS(SELECT 1 FROM openrouter_connections k WHERE k.account_id=NEW.account_id AND k.state='linked' AND k.epoch=NEW.credential_epoch)
 AND (NEW.source_origin='local-original' OR EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN drive_connections d ON d.account_id=b.credential_owner_id JOIN notes bn ON bn.id=b.note_id WHERE b.id=NEW.source_binding_id AND b.cancel_generation=0 AND d.state='linked' AND d.epoch=b.drive_epoch AND json_extract(d.credential,'$.subject')=b.subject AND bn.ownership_generation=b.ownership_generation))
 AND EXISTS(SELECT 1 FROM notes n JOIN originals o ON o.id=NEW.original_id JOIN accounts a ON a.id=NEW.account_id
 WHERE n.id=NEW.note_id AND n.lifecycle='active' AND n.version=NEW.note_version AND o.note_id=n.id
 AND o.sha256=NEW.source_sha256 AND o.bytes=NEW.source_bytes AND a.verified_at IS NOT NULL
 AND ((n.owner_workspace_id IS NULL AND n.owner_account_id=a.id)
 OR EXISTS(SELECT 1 FROM workspace_members m JOIN workspaces w ON w.id=m.workspace_id WHERE m.workspace_id=n.owner_workspace_id AND m.account_id=a.id AND m.role IN('owner','editor') AND w.state='active')))
 AND ((SELECT coalesce(sum(source_memory_bytes),0) FROM llm_conversions)
 +(SELECT coalesce(sum(source_memory_bytes),0) FROM llm_pdf_previews)
 +(SELECT coalesce(sum(source_memory_bytes),0) FROM machine_regenerations)-OLD.source_memory_bytes+NEW.source_memory_bytes)<=104857600,0))
 OR (NEW.source_input_receipt IS NOT NULL AND NOT coalesce(CASE WHEN json_valid(NEW.source_input_receipt) THEN
 json_type(NEW.source_input_receipt)='object'
 AND (SELECT count(*) FROM json_each(NEW.source_input_receipt))=CASE json_extract(NEW.source_input_receipt,'$.state') WHEN 'closed' THEN 6 ELSE 5 END
 AND NOT EXISTS(SELECT 1 FROM json_each(NEW.source_input_receipt) WHERE key NOT IN('consumer','runtimeId','token','generation','state','proofId'))
 AND json_type(NEW.source_input_receipt,'$.consumer')='object'
 AND (SELECT count(*) FROM json_each(NEW.source_input_receipt,'$.consumer'))=2
 AND json_extract(NEW.source_input_receipt,'$.consumer.kind')='llm-conversion' AND json_extract(NEW.source_input_receipt,'$.consumer.id')=NEW.job_id
 AND json_extract(NEW.source_input_receipt,'$.runtimeId')=NEW.runtime_id AND json_extract(NEW.source_input_receipt,'$.token')=NEW.owner_token
 AND json_type(NEW.source_input_receipt,'$.generation')='integer' AND json_extract(NEW.source_input_receipt,'$.generation') BETWEEN 1 AND 9007199254740991
 AND ((NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state') IN('active','unknown') AND json_type(NEW.source_input_receipt,'$.proofId') IS NULL)
 OR (NEW.source_memory_bytes=0 AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND json_type(NEW.source_input_receipt,'$.proofId')='text' AND length(json_extract(NEW.source_input_receipt,'$.proofId'))=36))
 ELSE 0 END,0))
 OR (NEW.source_input_receipt IS NOT OLD.source_input_receipt AND NOT coalesce(
 (OLD.source_input_receipt IS NULL AND OLD.source_memory_bytes=0 AND NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.generation')=1)
 OR (OLD.source_input_receipt IS NOT NULL AND NEW.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.consumer.kind')=json_extract(OLD.source_input_receipt,'$.consumer.kind') AND json_extract(NEW.source_input_receipt,'$.consumer.id')=json_extract(OLD.source_input_receipt,'$.consumer.id')
 AND ((OLD.source_memory_bytes=0 AND json_extract(OLD.source_input_receipt,'$.state')='closed' AND NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.generation')=json_extract(OLD.source_input_receipt,'$.generation')+1)
 OR (json_extract(NEW.source_input_receipt,'$.generation')=json_extract(OLD.source_input_receipt,'$.generation') AND json_extract(NEW.source_input_receipt,'$.runtimeId')=json_extract(OLD.source_input_receipt,'$.runtimeId') AND json_extract(NEW.source_input_receipt,'$.token')=json_extract(OLD.source_input_receipt,'$.token')
 AND ((json_extract(OLD.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.state')='unknown') OR (json_extract(OLD.source_input_receipt,'$.state') IN('active','unknown') AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND OLD.owner_state!='unknown' AND NEW.owner_state!='unknown'))))),0))
 BEGIN SELECT RAISE(ABORT,'regeneration_source_changed'); END;
--> statement-breakpoint
CREATE TRIGGER llm_conversions_source_delete BEFORE DELETE ON llm_conversions
 WHEN (OLD.source_binding_id IS NOT NULL OR OLD.source_memory_bytes!=0) AND NOT coalesce((EXISTS(SELECT 1 FROM notes n
 JOIN note_purges p ON p.id=n.trash_operation_id AND p.note_id=n.id
 JOIN account_deletion_purges ap ON ap.purge_id=p.id AND ap.note_id=n.id AND ap.intent_id=p.account_deletion_id
 JOIN account_deletions d ON d.id=ap.intent_id
 JOIN accounts a ON a.id=d.account_id
 WHERE n.id=OLD.note_id AND n.owner_workspace_id IS NULL AND n.owner_account_id=d.account_id
 AND n.lifecycle='purging' AND p.cause='account-deletion' AND p.operation_id=d.id
 AND p.deleted_account_id=d.account_id AND p.account_id IS NULL AND p.workspace_id IS NULL AND p.workspace_deletion_id IS NULL
 AND p.state='running' AND p.lease_token IS NOT NULL AND p.lease_until>p.updated_at
 AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state!='succeeded')
 AND OLD.phase='terminal' AND OLD.outcome='unknown' AND OLD.owner_state='closed'
 AND OLD.runtime_id IS NOT NULL AND OLD.owner_token IS NOT NULL AND OLD.source_memory_bytes=0
 AND OLD.source_input_receipt IS NOT NULL AND json_valid(OLD.source_input_receipt)
 AND json_extract(OLD.source_input_receipt,'$.state')='closed'
 AND json_extract(OLD.source_input_receipt,'$.runtimeId')=OLD.runtime_id
 AND json_extract(OLD.source_input_receipt,'$.token')=OLD.owner_token
 AND json_type(OLD.source_input_receipt,'$.generation')='integer'
 AND json_extract(OLD.source_input_receipt,'$.generation') BETWEEN 1 AND 9007199254740991
 AND json_type(OLD.source_input_receipt,'$.proofId')='text' AND length(json_extract(OLD.source_input_receipt,'$.proofId'))=36
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts x JOIN regeneration_source_bindings b ON b.id=x.binding_id WHERE b.note_id=OLD.note_id AND NOT coalesce(x.phase='terminal' AND ((x.owner_state='none' AND x.cancel_generation>0 AND json_extract(x.completion,'$.kind')='never-owned' AND json_extract(x.completion,'$.outcome')='cancelled') OR (x.owner_state='closed' AND json_extract(x.completion,'$.kind')='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
 AND NOT EXISTS(SELECT 1 FROM machine_regenerations m WHERE m.note_id=OLD.note_id AND (m.phase!='terminal' OR m.owner_state IN('active','unknown') OR m.source_memory_bytes!=0 OR (m.source_input_receipt IS NOT NULL AND json_extract(m.source_input_receipt,'$.state')!='closed')))
 AND NOT EXISTS(SELECT 1 FROM llm_conversions c WHERE c.note_id=OLD.note_id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.response_budget!=0 OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed') OR EXISTS(SELECT 1 FROM llm_quota_reservations q WHERE q.job_id=c.job_id AND q.state='reserved')))
 AND NOT EXISTS(SELECT 1 FROM llm_pdf_previews x WHERE x.note_id=OLD.note_id AND (x.state IN('queued','running','unknown') OR x.owner_state IN('active','unknown') OR x.source_memory_bytes!=0 OR (x.source_input_receipt IS NOT NULL AND json_extract(x.source_input_receipt,'$.state')!='closed')))
 AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs j WHERE j.note_id=OLD.note_id AND j.terminal_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.note_id=OLD.note_id AND (t.owner_state IN('active','unknown') OR t.phase NOT IN('succeeded','failed','cancelled') OR t.read_pinned!=0 OR t.refresh_pending!=0 OR (t.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments ack WHERE ack.kind='backup' AND ack.id=t.id AND ack.runtime_generation=t.runtime_generation AND ack.owner_token=t.owner_token))))
 AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (
 w.note_id=OLD.note_id OR
 (w.kind='media-upload' AND EXISTS(SELECT 1 FROM media_uploads u JOIN media_drafts md ON md.id=u.draft_id WHERE u.id=w.owner_id AND md.note_id=OLD.note_id)) OR
 (w.kind='reference-job' AND EXISTS(SELECT 1 FROM reference_jobs j WHERE j.id=w.owner_id AND (j.note_id=OLD.note_id OR EXISTS(SELECT 1 FROM reference_settings rs JOIN reference_settings own ON own.bundle_id=rs.bundle_id WHERE rs.note_id=j.note_id AND own.note_id=OLD.note_id)))) OR
 (w.kind='conversion-job' AND EXISTS(SELECT 1 FROM conversion_jobs j WHERE j.id=w.owner_id AND j.note_id=OLD.note_id)) OR
 (w.kind='llm-pdf-preview' AND EXISTS(SELECT 1 FROM llm_pdf_previews v WHERE v.id=w.owner_id AND v.note_id=OLD.note_id)) OR
 (w.kind='drive-backup' AND EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.id=w.owner_id AND t.note_id=OLD.note_id)) OR
 (w.kind='export-operation' AND EXISTS(SELECT 1 FROM export_operations e WHERE e.id=w.owner_id AND e.note_id=OLD.note_id)) OR
 (w.kind='pdf-artifact' AND EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='pdf-delivery' AND EXISTS(SELECT 1 FROM pdf_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE v.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='pdf-anonymous-delivery' AND EXISTS(SELECT 1 FROM pdf_anonymous_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE v.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='zip-source' AND EXISTS(SELECT 1 FROM zip_attempts v JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-spool' AND EXISTS(SELECT 1 FROM zip_spools z JOIN zip_attempts v ON v.id=z.attempt_id JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE z.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-assembly' AND EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-delivery' AND EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE v.id=w.owner_id AND e.live_note_id=OLD.note_id)) OR
 (w.kind='import-upload' AND EXISTS(SELECT 1 FROM upload_reservations u JOIN originals o ON o.storage_key=u.storage_key WHERE u.id=w.owner_id AND o.note_id=OLD.note_id))))
 AND NOT EXISTS(SELECT 1 FROM pdf_computations c WHERE c.live_note_id=OLD.note_id AND (c.state!='closed' OR c.workspace_removed=0))
 AND NOT EXISTS(SELECT 1 FROM pdf_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE a.live_note_id=OLD.note_id AND v.state!='closed')
 AND NOT EXISTS(SELECT 1 FROM pdf_anonymous_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE a.live_note_id=OLD.note_id AND v.state!='closed')
 AND NOT EXISTS(SELECT 1 FROM zip_targets t JOIN zip_requests q ON q.id=t.request_id WHERE t.live_note_id=OLD.note_id AND q.state!='terminal')
 AND NOT EXISTS(SELECT 1 FROM zip_pdf_holds h JOIN pdf_artifacts a ON a.id=h.artifact_id WHERE a.live_note_id=OLD.note_id AND h.state!='released')
 AND NOT EXISTS(SELECT 1 FROM zip_spool_refs f JOIN zip_targets t ON t.request_id=f.request_id AND t.ordinal=f.ordinal WHERE t.live_note_id=OLD.note_id)
 AND NOT EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE t.live_note_id=OLD.note_id AND (v.state!='closed' OR v.storage_key IS NOT NULL))
 AND NOT EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE e.live_note_id=OLD.note_id AND v.state!='closed')
 AND json_extract(OLD.source_input_receipt,'$.consumer.kind')='llm-conversion' AND json_extract(OLD.source_input_receipt,'$.consumer.id')=OLD.job_id),0)
BEGIN SELECT RAISE(ABORT,'regeneration_source_owned'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_previews_source_insert BEFORE INSERT ON llm_pdf_previews WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.preview_id=NEW.id AND b.executor_id=NEW.account_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=NEW.source_sha256 AND r.bytes=NEW.source_bytes AND o.format='pdf')))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR NEW.source_origin='redacted' OR NEW.source_memory_bytes!=0
 OR NEW.source_input_receipt IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'regeneration_source_invalid'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_previews_source_update BEFORE UPDATE ON llm_pdf_previews WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.preview_id=NEW.id AND b.executor_id=NEW.account_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=NEW.source_sha256 AND r.bytes=NEW.source_bytes AND o.format='pdf')))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR (NEW.source_origin='redacted' AND NOT coalesce((NEW.state IN('consumed','failed','cancelled','expired')) AND NEW.owner_state IN('idle','closed') AND NEW.source_memory_bytes=0,0))
 OR ((NEW.source_origin IS NOT OLD.source_origin OR NEW.source_binding_id IS NOT OLD.source_binding_id)
 AND NOT coalesce(OLD.source_origin='drive-record' AND NEW.source_origin='redacted' AND (NEW.state IN('consumed','failed','cancelled','expired')) AND NEW.owner_state IN('idle','closed') AND NEW.source_memory_bytes=0
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes<OLD.source_memory_bytes AND NOT coalesce(((OLD.source_input_receipt IS NULL AND NEW.source_input_receipt IS NULL AND NEW.owner_state='closed') OR (OLD.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND OLD.owner_state!='unknown' AND NEW.owner_state!='unknown'))
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes>OLD.source_memory_bytes AND NOT coalesce(
 NEW.source_origin!='redacted' AND NEW.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.state')='active' AND NEW.owner_state='active' AND NEW.runtime_id IS NOT NULL AND NEW.owner_token IS NOT NULL
 AND NEW.cancel_generation=0 AND (NEW.state='running')
 AND EXISTS(SELECT 1 FROM openrouter_connections k WHERE k.account_id=NEW.account_id AND k.state='linked' AND k.epoch=NEW.credential_epoch)
 AND (NEW.source_origin='local-original' OR EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN drive_connections d ON d.account_id=b.credential_owner_id JOIN notes bn ON bn.id=b.note_id WHERE b.id=NEW.source_binding_id AND b.cancel_generation=0 AND d.state='linked' AND d.epoch=b.drive_epoch AND json_extract(d.credential,'$.subject')=b.subject AND bn.ownership_generation=b.ownership_generation))
 AND EXISTS(SELECT 1 FROM notes n JOIN originals o ON o.id=NEW.original_id JOIN accounts a ON a.id=NEW.account_id
 WHERE n.id=NEW.note_id AND n.lifecycle='active' AND n.version=NEW.note_version AND o.note_id=n.id
 AND o.sha256=NEW.source_sha256 AND o.bytes=NEW.source_bytes AND a.verified_at IS NOT NULL
 AND ((n.owner_workspace_id IS NULL AND n.owner_account_id=a.id)
 OR EXISTS(SELECT 1 FROM workspace_members m JOIN workspaces w ON w.id=m.workspace_id WHERE m.workspace_id=n.owner_workspace_id AND m.account_id=a.id AND m.role IN('owner','editor') AND w.state='active')))
 AND ((SELECT coalesce(sum(source_memory_bytes),0) FROM llm_conversions)
 +(SELECT coalesce(sum(source_memory_bytes),0) FROM llm_pdf_previews)
 +(SELECT coalesce(sum(source_memory_bytes),0) FROM machine_regenerations)-OLD.source_memory_bytes+NEW.source_memory_bytes)<=104857600,0))
 OR (NEW.source_input_receipt IS NOT NULL AND NOT coalesce(CASE WHEN json_valid(NEW.source_input_receipt) THEN
 json_type(NEW.source_input_receipt)='object'
 AND (SELECT count(*) FROM json_each(NEW.source_input_receipt))=CASE json_extract(NEW.source_input_receipt,'$.state') WHEN 'closed' THEN 6 ELSE 5 END
 AND NOT EXISTS(SELECT 1 FROM json_each(NEW.source_input_receipt) WHERE key NOT IN('consumer','runtimeId','token','generation','state','proofId'))
 AND json_type(NEW.source_input_receipt,'$.consumer')='object'
 AND (SELECT count(*) FROM json_each(NEW.source_input_receipt,'$.consumer'))=2
 AND json_extract(NEW.source_input_receipt,'$.consumer.kind')='pdf-preview' AND json_extract(NEW.source_input_receipt,'$.consumer.id')=NEW.id
 AND json_extract(NEW.source_input_receipt,'$.runtimeId')=NEW.runtime_id AND json_extract(NEW.source_input_receipt,'$.token')=NEW.owner_token
 AND json_type(NEW.source_input_receipt,'$.generation')='integer' AND json_extract(NEW.source_input_receipt,'$.generation') BETWEEN 1 AND 9007199254740991
 AND ((NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state') IN('active','unknown') AND json_type(NEW.source_input_receipt,'$.proofId') IS NULL)
 OR (NEW.source_memory_bytes=0 AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND json_type(NEW.source_input_receipt,'$.proofId')='text' AND length(json_extract(NEW.source_input_receipt,'$.proofId'))=36))
 ELSE 0 END,0))
 OR (NEW.source_input_receipt IS NOT OLD.source_input_receipt AND NOT coalesce(
 (OLD.source_input_receipt IS NULL AND OLD.source_memory_bytes=0 AND NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.generation')=1)
 OR (OLD.source_input_receipt IS NOT NULL AND NEW.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.consumer.kind')=json_extract(OLD.source_input_receipt,'$.consumer.kind') AND json_extract(NEW.source_input_receipt,'$.consumer.id')=json_extract(OLD.source_input_receipt,'$.consumer.id')
 AND ((OLD.source_memory_bytes=0 AND json_extract(OLD.source_input_receipt,'$.state')='closed' AND NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.generation')=json_extract(OLD.source_input_receipt,'$.generation')+1)
 OR (json_extract(NEW.source_input_receipt,'$.generation')=json_extract(OLD.source_input_receipt,'$.generation') AND json_extract(NEW.source_input_receipt,'$.runtimeId')=json_extract(OLD.source_input_receipt,'$.runtimeId') AND json_extract(NEW.source_input_receipt,'$.token')=json_extract(OLD.source_input_receipt,'$.token')
 AND ((json_extract(OLD.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.state')='unknown') OR (json_extract(OLD.source_input_receipt,'$.state') IN('active','unknown') AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND OLD.owner_state!='unknown' AND NEW.owner_state!='unknown'))))),0))
 BEGIN SELECT RAISE(ABORT,'regeneration_source_changed'); END;
--> statement-breakpoint
CREATE TRIGGER llm_pdf_previews_source_delete BEFORE DELETE ON llm_pdf_previews
 WHEN OLD.source_binding_id IS NOT NULL OR OLD.source_memory_bytes!=0
 BEGIN SELECT RAISE(ABORT,'regeneration_source_owned'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regenerations_source_insert BEFORE INSERT ON machine_regenerations WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.machine_request_id=NEW.id AND b.executor_id=NEW.executor_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=json_extract(NEW.source,'$.sha256') AND r.bytes=json_extract(NEW.source,'$.bytes') AND o.format=json_extract(NEW.source,'$.format'))))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR NEW.source_origin='redacted' OR NEW.source_memory_bytes!=0
 OR NEW.source_input_receipt IS NOT NULL
 BEGIN SELECT RAISE(ABORT,'regeneration_source_invalid'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regenerations_source_update BEFORE UPDATE ON machine_regenerations WHEN NEW.source_origin IS NULL OR NEW.source_origin NOT IN('local-original','drive-record','redacted')
 OR (NEW.source_origin IN('local-original','redacted') AND NEW.source_binding_id IS NOT NULL)
 OR (NEW.source_origin='drive-record' AND (NEW.source_binding_id IS NULL OR NOT EXISTS(
 SELECT 1 FROM regeneration_source_bindings b JOIN drive_backup_records r ON r.id=b.record_id JOIN originals o ON o.id=b.original_id
 WHERE b.id=NEW.source_binding_id AND b.machine_request_id=NEW.id AND b.executor_id=NEW.executor_id
 AND b.note_id=NEW.note_id AND b.original_id=NEW.original_id AND r.sha256=json_extract(NEW.source,'$.sha256') AND r.bytes=json_extract(NEW.source,'$.bytes') AND o.format=json_extract(NEW.source,'$.format'))))
 OR typeof(NEW.source_memory_bytes)!='integer' OR NEW.source_memory_bytes NOT IN(0,52428800)
 OR (NEW.source_origin='redacted' AND NOT coalesce((NEW.phase='terminal' AND NEW.outcome!='unknown') AND NEW.owner_state IN('none','closed') AND NEW.source_memory_bytes=0,0))
 OR ((NEW.source_origin IS NOT OLD.source_origin OR NEW.source_binding_id IS NOT OLD.source_binding_id)
 AND NOT coalesce(OLD.source_origin='drive-record' AND NEW.source_origin='redacted' AND (NEW.phase='terminal' AND NEW.outcome!='unknown') AND NEW.owner_state IN('none','closed') AND NEW.source_memory_bytes=0
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes<OLD.source_memory_bytes AND NOT coalesce(((OLD.source_input_receipt IS NULL AND NEW.source_input_receipt IS NULL AND NEW.owner_state='closed') OR (OLD.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND OLD.owner_state!='unknown' AND NEW.owner_state!='unknown'))
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts WHERE binding_id=OLD.source_binding_id AND NOT coalesce(phase='terminal' AND (json_extract(completion,'$.kind')='never-owned' OR (owner_state='closed' AND json_extract(completion,'$.callerEnded')=1 AND json_extract(completion,'$.acknowledged')=1)),0)),0))
 OR (NEW.source_memory_bytes>OLD.source_memory_bytes AND NOT coalesce(
 NEW.source_origin!='redacted' AND NEW.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.state')='active' AND NEW.owner_state='active' AND NEW.runtime_id IS NOT NULL AND NEW.owner_token IS NOT NULL
 AND NEW.cancel_generation=0 AND (NEW.phase!='terminal' AND NEW.outcome='pending')
 AND (NEW.source_origin='local-original' OR EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN drive_connections d ON d.account_id=b.credential_owner_id JOIN notes bn ON bn.id=b.note_id WHERE b.id=NEW.source_binding_id AND b.cancel_generation=0 AND d.state='linked' AND d.epoch=b.drive_epoch AND json_extract(d.credential,'$.subject')=b.subject AND bn.ownership_generation=b.ownership_generation))
 AND EXISTS(SELECT 1 FROM notes n JOIN originals o ON o.id=NEW.original_id JOIN accounts a ON a.id=NEW.executor_id
 WHERE n.id=NEW.note_id AND n.lifecycle='active' AND n.version=NEW.note_version AND o.note_id=n.id
 AND o.sha256=json_extract(NEW.source,'$.sha256') AND o.bytes=json_extract(NEW.source,'$.bytes') AND a.verified_at IS NOT NULL
 AND ((n.owner_workspace_id IS NULL AND n.owner_account_id=a.id)
 OR EXISTS(SELECT 1 FROM workspace_members m JOIN workspaces w ON w.id=m.workspace_id WHERE m.workspace_id=n.owner_workspace_id AND m.account_id=a.id AND m.role IN('owner','editor') AND w.state='active')))
 AND ((SELECT coalesce(sum(source_memory_bytes),0) FROM llm_conversions)
 +(SELECT coalesce(sum(source_memory_bytes),0) FROM llm_pdf_previews)
 +(SELECT coalesce(sum(source_memory_bytes),0) FROM machine_regenerations)-OLD.source_memory_bytes+NEW.source_memory_bytes)<=104857600,0))
 OR (NEW.source_input_receipt IS NOT NULL AND NOT coalesce(CASE WHEN json_valid(NEW.source_input_receipt) THEN
 json_type(NEW.source_input_receipt)='object'
 AND (SELECT count(*) FROM json_each(NEW.source_input_receipt))=CASE json_extract(NEW.source_input_receipt,'$.state') WHEN 'closed' THEN 6 ELSE 5 END
 AND NOT EXISTS(SELECT 1 FROM json_each(NEW.source_input_receipt) WHERE key NOT IN('consumer','runtimeId','token','generation','state','proofId'))
 AND json_type(NEW.source_input_receipt,'$.consumer')='object'
 AND (SELECT count(*) FROM json_each(NEW.source_input_receipt,'$.consumer'))=2
 AND json_extract(NEW.source_input_receipt,'$.consumer.kind')='machine-regeneration' AND json_extract(NEW.source_input_receipt,'$.consumer.id')=NEW.id
 AND json_extract(NEW.source_input_receipt,'$.runtimeId')=NEW.runtime_id AND json_extract(NEW.source_input_receipt,'$.token')=NEW.owner_token
 AND json_type(NEW.source_input_receipt,'$.generation')='integer' AND json_extract(NEW.source_input_receipt,'$.generation') BETWEEN 1 AND 9007199254740991
 AND ((NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state') IN('active','unknown') AND json_type(NEW.source_input_receipt,'$.proofId') IS NULL)
 OR (NEW.source_memory_bytes=0 AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND json_type(NEW.source_input_receipt,'$.proofId')='text' AND length(json_extract(NEW.source_input_receipt,'$.proofId'))=36))
 ELSE 0 END,0))
 OR (NEW.source_input_receipt IS NOT OLD.source_input_receipt AND NOT coalesce(
 (OLD.source_input_receipt IS NULL AND OLD.source_memory_bytes=0 AND NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.generation')=1)
 OR (OLD.source_input_receipt IS NOT NULL AND NEW.source_input_receipt IS NOT NULL AND json_extract(NEW.source_input_receipt,'$.consumer.kind')=json_extract(OLD.source_input_receipt,'$.consumer.kind') AND json_extract(NEW.source_input_receipt,'$.consumer.id')=json_extract(OLD.source_input_receipt,'$.consumer.id')
 AND ((OLD.source_memory_bytes=0 AND json_extract(OLD.source_input_receipt,'$.state')='closed' AND NEW.source_memory_bytes=52428800 AND json_extract(NEW.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.generation')=json_extract(OLD.source_input_receipt,'$.generation')+1)
 OR (json_extract(NEW.source_input_receipt,'$.generation')=json_extract(OLD.source_input_receipt,'$.generation') AND json_extract(NEW.source_input_receipt,'$.runtimeId')=json_extract(OLD.source_input_receipt,'$.runtimeId') AND json_extract(NEW.source_input_receipt,'$.token')=json_extract(OLD.source_input_receipt,'$.token')
 AND ((json_extract(OLD.source_input_receipt,'$.state')='active' AND json_extract(NEW.source_input_receipt,'$.state')='unknown') OR (json_extract(OLD.source_input_receipt,'$.state') IN('active','unknown') AND json_extract(NEW.source_input_receipt,'$.state')='closed' AND OLD.owner_state!='unknown' AND NEW.owner_state!='unknown'))))),0))
 BEGIN SELECT RAISE(ABORT,'regeneration_source_changed'); END;
--> statement-breakpoint
CREATE TRIGGER machine_regenerations_source_delete BEFORE DELETE ON machine_regenerations
 WHEN (OLD.source_binding_id IS NOT NULL OR OLD.source_memory_bytes!=0) AND NOT coalesce((EXISTS(SELECT 1 FROM notes n
 JOIN note_purges p ON p.id=n.trash_operation_id AND p.note_id=n.id
 JOIN account_deletion_purges ap ON ap.purge_id=p.id AND ap.note_id=n.id AND ap.intent_id=p.account_deletion_id
 JOIN account_deletions d ON d.id=ap.intent_id
 JOIN accounts a ON a.id=d.account_id
 WHERE n.id=OLD.note_id AND n.owner_workspace_id IS NULL AND n.owner_account_id=d.account_id
 AND n.lifecycle='purging' AND p.cause='account-deletion' AND p.operation_id=d.id
 AND p.deleted_account_id=d.account_id AND p.account_id IS NULL AND p.workspace_id IS NULL AND p.workspace_deletion_id IS NULL
 AND p.state='running' AND p.lease_token IS NOT NULL AND p.lease_until>p.updated_at
 AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state!='succeeded')
 AND OLD.phase='terminal' AND OLD.outcome='unknown' AND OLD.owner_state='closed'
 AND OLD.runtime_id IS NOT NULL AND OLD.owner_token IS NOT NULL AND OLD.source_memory_bytes=0
 AND OLD.source_input_receipt IS NOT NULL AND json_valid(OLD.source_input_receipt)
 AND json_extract(OLD.source_input_receipt,'$.state')='closed'
 AND json_extract(OLD.source_input_receipt,'$.runtimeId')=OLD.runtime_id
 AND json_extract(OLD.source_input_receipt,'$.token')=OLD.owner_token
 AND json_type(OLD.source_input_receipt,'$.generation')='integer'
 AND json_extract(OLD.source_input_receipt,'$.generation') BETWEEN 1 AND 9007199254740991
 AND json_type(OLD.source_input_receipt,'$.proofId')='text' AND length(json_extract(OLD.source_input_receipt,'$.proofId'))=36
 AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts x JOIN regeneration_source_bindings b ON b.id=x.binding_id WHERE b.note_id=OLD.note_id AND NOT coalesce(x.phase='terminal' AND ((x.owner_state='none' AND x.cancel_generation>0 AND json_extract(x.completion,'$.kind')='never-owned' AND json_extract(x.completion,'$.outcome')='cancelled') OR (x.owner_state='closed' AND json_extract(x.completion,'$.kind')='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
 AND NOT EXISTS(SELECT 1 FROM machine_regenerations m WHERE m.note_id=OLD.note_id AND (m.phase!='terminal' OR m.owner_state IN('active','unknown') OR m.source_memory_bytes!=0 OR (m.source_input_receipt IS NOT NULL AND json_extract(m.source_input_receipt,'$.state')!='closed')))
 AND NOT EXISTS(SELECT 1 FROM llm_conversions c WHERE c.note_id=OLD.note_id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.response_budget!=0 OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed') OR EXISTS(SELECT 1 FROM llm_quota_reservations q WHERE q.job_id=c.job_id AND q.state='reserved')))
 AND NOT EXISTS(SELECT 1 FROM llm_pdf_previews x WHERE x.note_id=OLD.note_id AND (x.state IN('queued','running','unknown') OR x.owner_state IN('active','unknown') OR x.source_memory_bytes!=0 OR (x.source_input_receipt IS NOT NULL AND json_extract(x.source_input_receipt,'$.state')!='closed')))
 AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs j WHERE j.note_id=OLD.note_id AND j.terminal_at IS NULL)
 AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.note_id=OLD.note_id AND (t.owner_state IN('active','unknown') OR t.phase NOT IN('succeeded','failed','cancelled') OR t.read_pinned!=0 OR t.refresh_pending!=0 OR (t.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments ack WHERE ack.kind='backup' AND ack.id=t.id AND ack.runtime_generation=t.runtime_generation AND ack.owner_token=t.owner_token))))
 AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (
 w.note_id=OLD.note_id OR
 (w.kind='media-upload' AND EXISTS(SELECT 1 FROM media_uploads u JOIN media_drafts md ON md.id=u.draft_id WHERE u.id=w.owner_id AND md.note_id=OLD.note_id)) OR
 (w.kind='reference-job' AND EXISTS(SELECT 1 FROM reference_jobs j WHERE j.id=w.owner_id AND (j.note_id=OLD.note_id OR EXISTS(SELECT 1 FROM reference_settings rs JOIN reference_settings own ON own.bundle_id=rs.bundle_id WHERE rs.note_id=j.note_id AND own.note_id=OLD.note_id)))) OR
 (w.kind='conversion-job' AND EXISTS(SELECT 1 FROM conversion_jobs j WHERE j.id=w.owner_id AND j.note_id=OLD.note_id)) OR
 (w.kind='llm-pdf-preview' AND EXISTS(SELECT 1 FROM llm_pdf_previews v WHERE v.id=w.owner_id AND v.note_id=OLD.note_id)) OR
 (w.kind='drive-backup' AND EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.id=w.owner_id AND t.note_id=OLD.note_id)) OR
 (w.kind='export-operation' AND EXISTS(SELECT 1 FROM export_operations e WHERE e.id=w.owner_id AND e.note_id=OLD.note_id)) OR
 (w.kind='pdf-artifact' AND EXISTS(SELECT 1 FROM pdf_artifacts a WHERE a.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='pdf-delivery' AND EXISTS(SELECT 1 FROM pdf_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE v.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='pdf-anonymous-delivery' AND EXISTS(SELECT 1 FROM pdf_anonymous_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE v.id=w.owner_id AND a.live_note_id=OLD.note_id)) OR
 (w.kind='zip-source' AND EXISTS(SELECT 1 FROM zip_attempts v JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-spool' AND EXISTS(SELECT 1 FROM zip_spools z JOIN zip_attempts v ON v.id=z.attempt_id JOIN zip_targets t ON t.request_id=v.request_id AND t.ordinal=v.ordinal WHERE z.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-assembly' AND EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE v.id=w.owner_id AND t.live_note_id=OLD.note_id)) OR
 (w.kind='zip-delivery' AND EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE v.id=w.owner_id AND e.live_note_id=OLD.note_id)) OR
 (w.kind='import-upload' AND EXISTS(SELECT 1 FROM upload_reservations u JOIN originals o ON o.storage_key=u.storage_key WHERE u.id=w.owner_id AND o.note_id=OLD.note_id))))
 AND NOT EXISTS(SELECT 1 FROM pdf_computations c WHERE c.live_note_id=OLD.note_id AND (c.state!='closed' OR c.workspace_removed=0))
 AND NOT EXISTS(SELECT 1 FROM pdf_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE a.live_note_id=OLD.note_id AND v.state!='closed')
 AND NOT EXISTS(SELECT 1 FROM pdf_anonymous_deliveries v JOIN pdf_artifacts a ON a.id=v.artifact_id WHERE a.live_note_id=OLD.note_id AND v.state!='closed')
 AND NOT EXISTS(SELECT 1 FROM zip_targets t JOIN zip_requests q ON q.id=t.request_id WHERE t.live_note_id=OLD.note_id AND q.state!='terminal')
 AND NOT EXISTS(SELECT 1 FROM zip_pdf_holds h JOIN pdf_artifacts a ON a.id=h.artifact_id WHERE a.live_note_id=OLD.note_id AND h.state!='released')
 AND NOT EXISTS(SELECT 1 FROM zip_spool_refs f JOIN zip_targets t ON t.request_id=f.request_id AND t.ordinal=f.ordinal WHERE t.live_note_id=OLD.note_id)
 AND NOT EXISTS(SELECT 1 FROM zip_assemblies v JOIN zip_targets t ON t.request_id=v.request_id WHERE t.live_note_id=OLD.note_id AND (v.state!='closed' OR v.storage_key IS NOT NULL))
 AND NOT EXISTS(SELECT 1 FROM zip_deliveries v JOIN zip_artifact_entries e ON e.artifact_id=v.artifact_id WHERE e.live_note_id=OLD.note_id AND v.state!='closed')
 AND json_extract(OLD.source_input_receipt,'$.consumer.kind')='machine-regeneration' AND json_extract(OLD.source_input_receipt,'$.consumer.id')=OLD.id),0)
BEGIN SELECT RAISE(ABORT,'regeneration_source_owned'); END;
--> statement-breakpoint
CREATE TRIGGER regeneration_attempt_claim_guard BEFORE UPDATE ON regeneration_source_attempts
WHEN OLD.owner_state='none' AND NEW.owner_state='active' AND (
 EXISTS(SELECT 1 FROM regeneration_source_attempts a WHERE a.id!=OLD.id AND (a.owner_state IN('active','unknown') OR (a.owner_state='closed' AND (coalesce(json_extract(a.completion,'$.callerEnded'),0)!=1 OR coalesce(json_extract(a.completion,'$.acknowledged'),0)!=1))))
 OR EXISTS(SELECT 1 FROM drive_backup_transfers WHERE owner_state IN('active','unknown')))
BEGIN SELECT RAISE(ABORT,'REGENERATION_SOURCE_HELD'); END;
--> statement-breakpoint
CREATE TRIGGER drive_backup_source_lane_guard BEFORE UPDATE ON drive_backup_transfers
WHEN OLD.owner_state IN('none','closed') AND NEW.owner_state='active'
 AND EXISTS(SELECT 1 FROM regeneration_source_attempts a WHERE (a.owner_state IN('active','unknown') OR (a.owner_state='closed' AND (coalesce(json_extract(a.completion,'$.callerEnded'),0)!=1 OR coalesce(json_extract(a.completion,'$.acknowledged'),0)!=1))))
BEGIN SELECT RAISE(ABORT,'REGENERATION_SOURCE_HELD'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_backup_targets_retirement BEFORE UPDATE ON drive_backup_targets
WHEN NOT coalesce((OLD.retention='usable' AND NEW.retention='usable' AND NEW.deletion_id IS NULL AND NEW.redaction_version=0) OR (OLD.retention='usable' AND NEW.retention='recorder-deleted' AND EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.account_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running') AND NEW.id IS OLD.id AND NEW.original_id IS OLD.original_id AND NEW.note_id IS OLD.note_id AND NEW.account_id IS OLD.account_id AND NEW.folder_epoch IS OLD.folder_epoch AND NEW.state IS OLD.state AND NEW.version IS OLD.version AND NEW.created_at IS OLD.created_at AND NEW.updated_at IS OLD.updated_at AND NEW.redaction_version=1 AND NEW.subject IS NULL AND NEW.marker IS NULL AND NEW.folder IS NULL AND NEW.file_id IS NULL AND NOT EXISTS(SELECT 1 FROM drive_authorization_attempts x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='authorization' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_control_operations x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='control' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0 OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='backup' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN regeneration_source_attempts x ON x.binding_id=b.id WHERE (b.executor_id=OLD.account_id OR b.credential_owner_id=OLD.account_id) AND NOT coalesce(x.phase='terminal' AND (json_extract(x.completion,'$.kind')='never-owned' OR (x.owner_state='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE (u.account_id=OLD.account_id OR u.result_account_id=OLD.account_id) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1))
AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (w.note_id IN(SELECT id FROM notes WHERE owner_account_id=OLD.account_id AND owner_workspace_id IS NULL) OR w.owner_id IN(SELECT id FROM drive_backup_transfers WHERE account_id=OLD.account_id))) AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers WHERE target_id=OLD.id) AND NOT EXISTS(SELECT 1 FROM drive_backup_target_heads WHERE target_id=OLD.id) AND NOT EXISTS(SELECT 1 FROM drive_backup_jobs WHERE target_id=OLD.id AND (terminal_at IS NULL OR admission_identity IS NOT NULL)) AND NOT EXISTS(SELECT 1 FROM drive_backup_records r JOIN regeneration_source_bindings b ON b.record_id=r.id WHERE r.target_id=OLD.id AND b.retention='usable')) OR (OLD.retention='recorder-deleted' AND NEW.id IS OLD.id AND NEW.retention IS OLD.retention AND NEW.deletion_id IS OLD.deletion_id AND NEW.redaction_version IS OLD.redaction_version AND NEW.original_id IS OLD.original_id AND NEW.note_id IS OLD.note_id AND NEW.account_id IS OLD.account_id AND NEW.subject IS OLD.subject AND NEW.marker IS OLD.marker AND NEW.folder IS OLD.folder AND NEW.folder_epoch IS OLD.folder_epoch AND NEW.file_id IS OLD.file_id AND NEW.state IS OLD.state AND NEW.version IS OLD.version AND NEW.created_at IS OLD.created_at AND NEW.updated_at IS OLD.updated_at),0)
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_backup_targets_normal_insert BEFORE INSERT ON drive_backup_targets
WHEN NEW.retention!='usable' OR NEW.deletion_id IS NOT NULL OR NEW.redaction_version!=0
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_backup_records_retirement BEFORE UPDATE ON drive_backup_records
WHEN NOT coalesce((OLD.retention='usable' AND NEW.retention='usable' AND NEW.deletion_id IS NULL AND NEW.redaction_version=0) OR (OLD.retention='usable' AND NEW.retention='recorder-deleted' AND EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.account_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running') AND NEW.id IS OLD.id AND NEW.version IS OLD.version AND NEW.target_id IS OLD.target_id AND NEW.note_id IS OLD.note_id AND NEW.original_id IS OLD.original_id AND NEW.account_id IS OLD.account_id AND NEW.bytes IS OLD.bytes AND NEW.sha256 IS OLD.sha256 AND NEW.created_at IS OLD.created_at AND NEW.redaction_version=1 AND NEW.subject IS NULL AND NEW.file_id IS NULL AND NEW.folder IS NULL AND NEW.web_view_link IS NULL AND NEW.resource_key_envelope IS NULL AND EXISTS(SELECT 1 FROM drive_backup_targets t WHERE t.id=OLD.target_id AND t.retention='recorder-deleted' AND t.deletion_id=NEW.deletion_id) AND NOT EXISTS(SELECT 1 FROM drive_authorization_attempts x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='authorization' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_control_operations x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='control' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0 OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='backup' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN regeneration_source_attempts x ON x.binding_id=b.id WHERE (b.executor_id=OLD.account_id OR b.credential_owner_id=OLD.account_id) AND NOT coalesce(x.phase='terminal' AND (json_extract(x.completion,'$.kind')='never-owned' OR (x.owner_state='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE (u.account_id=OLD.account_id OR u.result_account_id=OLD.account_id) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1))
AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (w.note_id IN(SELECT id FROM notes WHERE owner_account_id=OLD.account_id AND owner_workspace_id IS NULL) OR w.owner_id IN(SELECT id FROM drive_backup_transfers WHERE account_id=OLD.account_id)))) OR (OLD.retention='recorder-deleted' AND NEW.id IS OLD.id AND NEW.retention IS OLD.retention AND NEW.deletion_id IS OLD.deletion_id AND NEW.redaction_version IS OLD.redaction_version AND NEW.version IS OLD.version AND NEW.target_id IS OLD.target_id AND NEW.note_id IS OLD.note_id AND NEW.original_id IS OLD.original_id AND NEW.account_id IS OLD.account_id AND NEW.subject IS OLD.subject AND NEW.file_id IS OLD.file_id AND NEW.folder IS OLD.folder AND NEW.bytes IS OLD.bytes AND NEW.sha256 IS OLD.sha256 AND NEW.created_at IS OLD.created_at AND NEW.web_view_link IS OLD.web_view_link AND NEW.resource_key_envelope IS OLD.resource_key_envelope),0)
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_backup_records_normal_insert BEFORE INSERT ON drive_backup_records
WHEN NEW.retention!='usable' OR NEW.deletion_id IS NOT NULL OR NEW.redaction_version!=0
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_backup_jobs_retirement BEFORE UPDATE ON drive_backup_jobs
WHEN NOT coalesce((OLD.retention='usable' AND NEW.retention='usable' AND NEW.deletion_id IS NULL AND NEW.redaction_version=0) OR (OLD.retention='usable' AND NEW.retention='recorder-deleted' AND EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.account_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running') AND NEW.id IS OLD.id AND NEW.request_id IS OLD.request_id AND NEW.account_id IS OLD.account_id AND NEW.ordinal IS OLD.ordinal AND NEW.attempt IS OLD.attempt AND NEW.retry_of IS OLD.retry_of AND NEW.note_id IS OLD.note_id AND NEW.target_id IS OLD.target_id AND NEW.title IS OLD.title AND NEW.version IS OLD.version AND NEW.created_at IS OLD.created_at AND NEW.updated_at IS OLD.updated_at AND NEW.terminal_at IS OLD.terminal_at AND NEW.state IS OLD.state AND NEW.bytes IS OLD.bytes AND NEW.failure IS OLD.failure AND NEW.record_id IS OLD.record_id AND NEW.root_ordinal IS OLD.root_ordinal AND NEW.redaction_version=1 AND NEW.admission_identity IS NULL AND OLD.terminal_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers t WHERE t.job_id=OLD.id) AND NOT EXISTS(SELECT 1 FROM drive_authorization_attempts x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='authorization' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_control_operations x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='control' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0 OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='backup' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN regeneration_source_attempts x ON x.binding_id=b.id WHERE (b.executor_id=OLD.account_id OR b.credential_owner_id=OLD.account_id) AND NOT coalesce(x.phase='terminal' AND (json_extract(x.completion,'$.kind')='never-owned' OR (x.owner_state='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE (u.account_id=OLD.account_id OR u.result_account_id=OLD.account_id) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1))
AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (w.note_id IN(SELECT id FROM notes WHERE owner_account_id=OLD.account_id AND owner_workspace_id IS NULL) OR w.owner_id IN(SELECT id FROM drive_backup_transfers WHERE account_id=OLD.account_id)))) OR (OLD.retention='recorder-deleted' AND NEW.id IS OLD.id AND NEW.retention IS OLD.retention AND NEW.deletion_id IS OLD.deletion_id AND NEW.redaction_version IS OLD.redaction_version AND NEW.request_id IS OLD.request_id AND NEW.account_id IS OLD.account_id AND NEW.ordinal IS OLD.ordinal AND NEW.attempt IS OLD.attempt AND NEW.retry_of IS OLD.retry_of AND NEW.note_id IS OLD.note_id AND NEW.target_id IS OLD.target_id AND NEW.title IS OLD.title AND NEW.version IS OLD.version AND NEW.created_at IS OLD.created_at AND NEW.updated_at IS OLD.updated_at AND NEW.terminal_at IS OLD.terminal_at AND NEW.state IS OLD.state AND NEW.bytes IS OLD.bytes AND NEW.failure IS OLD.failure AND NEW.record_id IS OLD.record_id AND NEW.admission_identity IS OLD.admission_identity AND NEW.root_ordinal IS OLD.root_ordinal),0)
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_backup_jobs_normal_insert BEFORE INSERT ON drive_backup_jobs
WHEN NEW.retention!='usable' OR NEW.deletion_id IS NOT NULL OR NEW.redaction_version!=0
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_regeneration_source_bindings_retirement BEFORE UPDATE ON regeneration_source_bindings
WHEN NOT coalesce((OLD.retention='usable' AND NEW.retention='usable' AND NEW.deletion_id IS NULL AND NEW.redaction_version=0) OR (OLD.retention='usable' AND NEW.retention='recorder-deleted' AND (EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.executor_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running') OR EXISTS(SELECT 1 FROM account_deletions d JOIN accounts a ON a.id=d.account_id WHERE d.id=NEW.deletion_id AND d.account_id=OLD.credential_owner_id AND a.state='deleted' AND a.deletion_id=d.id AND a.auth_version=d.fence_auth_version AND d.state='running')) AND NEW.id IS OLD.id AND NEW.record_id IS OLD.record_id AND NEW.executor_id IS OLD.executor_id AND NEW.credential_owner_id IS OLD.credential_owner_id AND NEW.note_id IS OLD.note_id AND NEW.original_id IS OLD.original_id AND NEW.drive_epoch IS OLD.drive_epoch AND NEW.ownership_generation IS OLD.ownership_generation AND NEW.fingerprint IS OLD.fingerprint AND NEW.llm_job_id IS OLD.llm_job_id AND NEW.preview_id IS OLD.preview_id AND NEW.machine_request_id IS OLD.machine_request_id AND NEW.cancel_generation IS OLD.cancel_generation AND NEW.created_at IS OLD.created_at AND NEW.version=OLD.version+1 AND NEW.redaction_version=1 AND NEW.subject IS NULL AND NOT EXISTS(SELECT 1 FROM regeneration_source_attempts a WHERE a.binding_id=OLD.id AND NOT coalesce(a.phase='terminal' AND (json_extract(a.completion,'$.kind')='never-owned' OR (a.owner_state='closed' AND json_extract(a.completion,'$.callerEnded')=1 AND json_extract(a.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM llm_conversions c WHERE c.source_binding_id=OLD.id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed')))
AND NOT EXISTS(SELECT 1 FROM llm_pdf_previews c WHERE c.source_binding_id=OLD.id AND (c.state='running' OR c.owner_state IN('active','unknown') OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed')))
AND NOT EXISTS(SELECT 1 FROM machine_regenerations c WHERE c.source_binding_id=OLD.id AND (c.phase!='terminal' OR c.owner_state IN('active','unknown') OR c.source_memory_bytes!=0 OR (c.source_input_receipt IS NOT NULL AND json_extract(c.source_input_receipt,'$.state')!='closed')))) OR (OLD.retention='recorder-deleted' AND NEW.id IS OLD.id AND NEW.retention IS OLD.retention AND NEW.deletion_id IS OLD.deletion_id AND NEW.redaction_version IS OLD.redaction_version AND NEW.record_id IS OLD.record_id AND NEW.executor_id IS OLD.executor_id AND NEW.credential_owner_id IS OLD.credential_owner_id AND NEW.note_id IS OLD.note_id AND NEW.original_id IS OLD.original_id AND NEW.subject IS OLD.subject AND NEW.drive_epoch IS OLD.drive_epoch AND NEW.ownership_generation IS OLD.ownership_generation AND NEW.fingerprint IS OLD.fingerprint AND NEW.llm_job_id IS OLD.llm_job_id AND NEW.preview_id IS OLD.preview_id AND NEW.machine_request_id IS OLD.machine_request_id AND NEW.cancel_generation IS OLD.cancel_generation AND NEW.version IS OLD.version AND NEW.created_at IS OLD.created_at),0)
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_regeneration_source_bindings_normal_insert BEFORE INSERT ON regeneration_source_bindings
WHEN NEW.retention!='usable' OR NEW.deletion_id IS NOT NULL OR NEW.redaction_version!=0
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_account_retirement BEFORE UPDATE ON accounts
WHEN (OLD.state='deleted' AND NOT (NEW.id IS OLD.id AND NEW.state IS OLD.state AND NEW.deletion_id IS OLD.deletion_id AND NEW.email IS OLD.email AND NEW.password_hash IS OLD.password_hash AND NEW.auth_version IS OLD.auth_version AND NEW.created_at IS OLD.created_at AND NEW.verified_at IS OLD.verified_at)) OR (OLD.state='active' AND NEW.state='deleted' AND (NOT (EXISTS(SELECT 1 FROM account_deletions d WHERE d.id=NEW.deletion_id AND d.account_id=OLD.id AND d.fence_auth_version=NEW.auth_version AND NEW.auth_version=OLD.auth_version+1)) OR EXISTS(SELECT 1 FROM workspace_members m JOIN workspaces w ON w.id=m.workspace_id WHERE m.account_id=OLD.id AND m.role='owner' AND w.state='active' AND NOT EXISTS(SELECT 1 FROM workspace_members other JOIN accounts a ON a.id=other.account_id AND a.state='active' WHERE other.workspace_id=m.workspace_id AND other.role='owner' AND other.account_id!=OLD.id)))) OR NEW.id IS NOT OLD.id
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_account_active_insert BEFORE INSERT ON accounts
WHEN NEW.state!='active' OR NEW.deletion_id IS NOT NULL
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_workspace_last_owner_delete BEFORE DELETE ON workspace_members
WHEN OLD.role='owner' AND (1) AND EXISTS(SELECT 1 FROM workspaces WHERE id=OLD.workspace_id AND state='active') AND EXISTS(SELECT 1 FROM accounts WHERE id=OLD.account_id AND state='active') AND NOT EXISTS(SELECT 1 FROM workspace_members m JOIN accounts a ON a.id=m.account_id AND a.state='active' WHERE m.workspace_id=OLD.workspace_id AND m.role='owner' AND m.account_id!=OLD.account_id)
BEGIN SELECT RAISE(ABORT,'WORKSPACE_LAST_OWNER'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_workspace_last_owner_update BEFORE UPDATE ON workspace_members
WHEN OLD.role='owner' AND (NEW.role!='owner' OR NEW.workspace_id IS NOT OLD.workspace_id OR NEW.account_id IS NOT OLD.account_id) AND EXISTS(SELECT 1 FROM workspaces WHERE id=OLD.workspace_id AND state='active') AND EXISTS(SELECT 1 FROM accounts WHERE id=OLD.account_id AND state='active') AND NOT EXISTS(SELECT 1 FROM workspace_members m JOIN accounts a ON a.id=m.account_id AND a.state='active' WHERE m.workspace_id=OLD.workspace_id AND m.role='owner' AND m.account_id!=OLD.account_id)
BEGIN SELECT RAISE(ABORT,'WORKSPACE_LAST_OWNER'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_sessions_actor_insert BEFORE INSERT ON sessions
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_google_identities_actor_insert BEFORE INSERT ON google_identities
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_account_public_profiles_actor_insert BEFORE INSERT ON account_public_profiles
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_account_profile_icons_actor_insert BEFORE INSERT ON account_profile_icons
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_account_display_names_actor_insert BEFORE INSERT ON account_display_names
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_email_verifications_actor_insert BEFORE INSERT ON email_verifications
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_openrouter_connections_actor_insert BEFORE INSERT ON openrouter_connections
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_openrouter_attempts_actor_insert BEFORE INSERT ON openrouter_attempts
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_connections_actor_insert BEFORE INSERT ON drive_connections
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_authorization_attempts_actor_insert BEFORE INSERT ON drive_authorization_attempts
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_control_operations_actor_insert BEFORE INSERT ON drive_control_operations
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_import_batches_actor_insert BEFORE INSERT ON import_batches
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_source_bundles_actor_insert BEFORE INSERT ON source_bundles
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_upload_reservations_actor_insert BEFORE INSERT ON upload_reservations
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_media_drafts_actor_insert BEFORE INSERT ON media_drafts
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_media_uploads_actor_insert BEFORE INSERT ON media_uploads
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_pdf_requests_actor_insert BEFORE INSERT ON pdf_requests
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_zip_requests_actor_insert BEFORE INSERT ON zip_requests
WHEN NOT EXISTS(SELECT 1 FROM accounts WHERE id=NEW.account_id AND state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_conversion_jobs_admission BEFORE INSERT ON conversion_jobs
WHEN NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_conversion_jobs_claim BEFORE UPDATE ON conversion_jobs
WHEN (NEW.state IN('running','active') AND (NEW.lease_token IS NOT OLD.lease_token OR NEW.state IS NOT OLD.state)) AND NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_reference_jobs_admission BEFORE INSERT ON reference_jobs
WHEN NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_reference_jobs_claim BEFORE UPDATE ON reference_jobs
WHEN (NEW.state IN('running','active') AND (NEW.lease_token IS NOT OLD.lease_token OR NEW.state IS NOT OLD.state)) AND NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_llm_conversions_admission BEFORE INSERT ON llm_conversions
WHEN NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_llm_conversions_claim BEFORE UPDATE ON llm_conversions
WHEN (NEW.owner_state IN('running','active') AND (NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state IS NOT OLD.owner_state)) AND NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_llm_pdf_previews_admission BEFORE INSERT ON llm_pdf_previews
WHEN NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_llm_pdf_previews_claim BEFORE UPDATE ON llm_pdf_previews
WHEN (NEW.owner_state IN('running','active') AND (NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state IS NOT OLD.owner_state)) AND NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_machine_regenerations_admission BEFORE INSERT ON machine_regenerations
WHEN NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.executor_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_machine_regenerations_claim BEFORE UPDATE ON machine_regenerations
WHEN (NEW.owner_state IN('running','active') AND (NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state IS NOT OLD.owner_state)) AND NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.executor_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_backup_transfers_admission BEFORE INSERT ON drive_backup_transfers
WHEN NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_backup_transfers_claim BEFORE UPDATE ON drive_backup_transfers
WHEN (NEW.owner_state IN('running','active') AND (NEW.owner_token IS NOT OLD.owner_token OR NEW.owner_state IS NOT OLD.owner_state)) AND NOT (EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_source_binding_admission BEFORE INSERT ON regeneration_source_bindings
WHEN NOT (EXISTS(SELECT 1 FROM accounts e WHERE e.id=NEW.executor_id AND e.state='active') AND EXISTS(SELECT 1 FROM accounts c WHERE c.id=NEW.credential_owner_id AND c.state='active') AND EXISTS(SELECT 1 FROM notes n WHERE n.id=NEW.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_source_attempt_claim BEFORE UPDATE ON regeneration_source_attempts
WHEN NEW.owner_state='active' AND OLD.owner_state='none' AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN accounts e ON e.id=b.executor_id AND e.state='active' JOIN accounts c ON c.id=b.credential_owner_id AND c.state='active' WHERE b.id=NEW.binding_id AND b.retention='usable' AND EXISTS(SELECT 1 FROM notes n WHERE n.id=b.note_id AND n.lifecycle!='purging' AND ((n.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=n.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=n.owner_workspace_id AND w.state='active'))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_authorization_attempts_claim BEFORE UPDATE ON drive_authorization_attempts
WHEN NEW.owner_state='active' AND OLD.owner_state='none' AND NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_control_operations_claim BEFORE UPDATE ON drive_control_operations
WHEN NEW.owner_state='active' AND OLD.owner_state='none' AND NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_or_secret_adopt BEFORE UPDATE ON openrouter_connections
WHEN (NEW.credential_envelope IS NOT OLD.credential_envelope AND NEW.credential_envelope IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_google_actor_adopt BEFORE UPDATE ON google_auth_attempts
WHEN NEW.state IN('exchanging','verified','proof-required','reauth-ready','completed') AND NEW.state IS NOT OLD.state AND ((NEW.actor_account_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.actor_account_id AND a.state='active')) OR (NEW.target_account_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.target_account_id AND a.state='active')) OR (NEW.result_account_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.result_account_id AND a.state='active')))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_or_actor_adopt BEFORE UPDATE ON openrouter_attempts
WHEN NEW.state IN('exchanging','checking','completed') AND NEW.state IS NOT OLD.state AND NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active' AND a.auth_version=NEW.auth_version)
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_credential_use_immutable BEFORE UPDATE ON account_deletion_credential_uses
WHEN NOT coalesce((NEW.id IS OLD.id AND NEW.provider IS OLD.provider AND NEW.binding IS OLD.binding AND NEW.account_id IS OLD.account_id AND NEW.source_id IS OLD.source_id AND NEW.runtime_id IS OLD.runtime_id AND NEW.owner_token IS OLD.owner_token AND NEW.generation IS OLD.generation) AND ((OLD.state IN('active','unknown') AND NEW.state='closed' AND NEW.result_account_id IS OLD.result_account_id AND NEW.version=OLD.version+1 AND NEW.caller_ended=1 AND NEW.acknowledged=0 AND NEW.evidence_id IS NOT NULL) OR (OLD.state='closed' AND NEW.state='closed' AND NEW.result_account_id IS OLD.result_account_id AND NEW.caller_ended=1 AND OLD.acknowledged=0 AND NEW.acknowledged=1 AND NEW.evidence_id IS OLD.evidence_id AND NEW.version=OLD.version+1) OR (OLD.state='active' AND NEW.state='unknown' AND NEW.version=OLD.version+1 AND NEW.caller_ended=0 AND NEW.acknowledged=0 AND NEW.evidence_id IS NULL AND NEW.result_account_id IS OLD.result_account_id) OR (NEW.version=OLD.version AND NEW.state IS OLD.state AND NEW.caller_ended IS OLD.caller_ended AND NEW.acknowledged IS OLD.acknowledged AND NEW.evidence_id IS OLD.evidence_id AND (NEW.result_account_id IS OLD.result_account_id OR (OLD.result_account_id IS NULL AND NEW.result_account_id IS NOT NULL AND EXISTS(SELECT 1 FROM google_auth_attempts a JOIN google_identities g ON g.account_id=NEW.result_account_id AND g.subject=json_extract(a.claims,'$.subject') WHERE a.id=OLD.source_id AND OLD.provider='google' AND a.state IN('verified','proof-required') AND a.version>json_extract(OLD.binding,'$.source.version') AND a.browser_hash=json_extract(OLD.binding,'$.authority.browserHash') AND a.browser_epoch=json_extract(OLD.binding,'$.authority.browserEpoch') AND a.actor_account_id IS OLD.account_id AND a.actor_auth_version IS json_extract(OLD.binding,'$.authority.authVersion')) OR (OLD.result_account_id IS NULL AND NEW.result_account_id=OLD.account_id AND OLD.provider='openrouter'))))),0)
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_credential_use_delete BEFORE DELETE ON account_deletion_credential_uses
WHEN OLD.state!='closed' OR OLD.caller_ended!=1 OR OLD.acknowledged!=1 OR EXISTS(SELECT 1 FROM account_deletion_credential_origins WHERE use_id=OLD.id)
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_credential_origin_immutable BEFORE UPDATE ON account_deletion_credential_origins
WHEN OLD.provider IS NOT NEW.provider OR OLD.account_id IS NOT NEW.account_id OR OLD.mode='legacy-unproven' OR NEW.mode!='native-v1'
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_authorization_attempts_delete_closed BEFORE DELETE ON drive_authorization_attempts
WHEN OLD.owner_state IN('active','unknown') OR (OLD.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments a WHERE a.kind='authorization' AND a.id=OLD.id AND a.runtime_generation=OLD.runtime_generation AND a.owner_token=OLD.owner_token))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_control_operations_delete_closed BEFORE DELETE ON drive_control_operations
WHEN OLD.owner_state IN('active','unknown') OR (OLD.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments a WHERE a.kind='control' AND a.id=OLD.id AND a.runtime_generation=OLD.runtime_generation AND a.owner_token=OLD.owner_token))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_backup_transfers_delete_closed BEFORE DELETE ON drive_backup_transfers
WHEN OLD.owner_state IN('active','unknown') OR (OLD.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments a WHERE a.kind='backup' AND a.id=OLD.id AND a.runtime_generation=OLD.runtime_generation AND a.owner_token=OLD.owner_token))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_connections_retirement_cleanup BEFORE UPDATE ON drive_connections
WHEN OLD.credential IS NOT NULL AND NEW.credential IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=OLD.account_id AND a.state='deleted') AND NOT (NOT EXISTS(SELECT 1 FROM drive_authorization_attempts x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='authorization' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_control_operations x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='control' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0 OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='backup' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN regeneration_source_attempts x ON x.binding_id=b.id WHERE (b.executor_id=OLD.account_id OR b.credential_owner_id=OLD.account_id) AND NOT coalesce(x.phase='terminal' AND (json_extract(x.completion,'$.kind')='never-owned' OR (x.owner_state='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE (u.account_id=OLD.account_id OR u.result_account_id=OLD.account_id) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1))
AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (w.note_id IN(SELECT id FROM notes WHERE owner_account_id=OLD.account_id AND owner_workspace_id IS NULL) OR w.owner_id IN(SELECT id FROM drive_backup_transfers WHERE account_id=OLD.account_id))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_openrouter_connections_retirement_cleanup BEFORE UPDATE ON openrouter_connections
WHEN OLD.credential_envelope IS NOT NULL AND NEW.credential_envelope IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=OLD.account_id AND a.state='deleted') AND NOT (NOT EXISTS(SELECT 1 FROM drive_authorization_attempts x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='authorization' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_control_operations x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='control' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM drive_backup_transfers x WHERE x.account_id=OLD.account_id AND (x.owner_state IN('active','unknown') OR x.read_pinned!=0 OR x.refresh_pending!=0 OR (x.owner_state='closed' AND NOT EXISTS(SELECT 1 FROM account_deletion_drive_acknowledgments q WHERE q.kind='backup' AND q.id=x.id AND q.runtime_generation=x.runtime_generation AND q.owner_token=x.owner_token))))
AND NOT EXISTS(SELECT 1 FROM regeneration_source_bindings b JOIN regeneration_source_attempts x ON x.binding_id=b.id WHERE (b.executor_id=OLD.account_id OR b.credential_owner_id=OLD.account_id) AND NOT coalesce(x.phase='terminal' AND (json_extract(x.completion,'$.kind')='never-owned' OR (x.owner_state='closed' AND json_extract(x.completion,'$.callerEnded')=1 AND json_extract(x.completion,'$.acknowledged')=1)),0))
AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE (u.account_id=OLD.account_id OR u.result_account_id=OLD.account_id) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1))
AND NOT EXISTS(SELECT 1 FROM object_writes w WHERE w.active=1 AND (w.note_id IN(SELECT id FROM notes WHERE owner_account_id=OLD.account_id AND owner_workspace_id IS NULL) OR w.owner_id IN(SELECT id FROM drive_backup_transfers WHERE account_id=OLD.account_id))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_credential_use_admission BEFORE INSERT ON account_deletion_credential_uses
WHEN NEW.version!=1 OR NEW.state!='active' OR NEW.caller_ended!=0 OR NEW.acknowledged!=0 OR NEW.evidence_id IS NOT NULL OR NEW.result_account_id IS NOT NULL OR NOT coalesce((((NEW.account_id IS NULL AND NEW.provider='google' AND json_extract(NEW.binding,'$.authority.kind')='unresolved-google' AND json_extract(NEW.binding,'$.authority.accountId') IS NULL AND json_extract(NEW.binding,'$.authority.authVersion') IS NULL)
OR (json_extract(NEW.binding,'$.authority.kind')='account' AND json_extract(NEW.binding,'$.authority.accountId')=NEW.account_id AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active' AND a.auth_version=json_extract(NEW.binding,'$.authority.authVersion')))) AND json_extract(NEW.binding,'$.provider')=NEW.provider AND json_extract(NEW.binding,'$.source.id')=NEW.source_id AND ((NEW.provider='google' AND json_extract(NEW.binding,'$.operation')='callback' AND json_extract(NEW.binding,'$.source.kind')='google-attempt' AND EXISTS(SELECT 1 FROM google_auth_attempts a WHERE a.id=NEW.source_id AND a.state='exchanging' AND a.version=json_extract(NEW.binding,'$.source.version') AND a.browser_hash=json_extract(NEW.binding,'$.authority.browserHash') AND a.browser_epoch=json_extract(NEW.binding,'$.authority.browserEpoch') AND a.actor_account_id IS NEW.account_id AND a.actor_auth_version IS json_extract(NEW.binding,'$.authority.authVersion'))) OR (NEW.provider='openrouter' AND json_extract(NEW.binding,'$.source.kind')='openrouter-attempt' AND EXISTS(SELECT 1 FROM openrouter_attempts a WHERE a.id=NEW.source_id AND a.account_id=NEW.account_id AND a.auth_version=json_extract(NEW.binding,'$.authority.authVersion') AND a.version=json_extract(NEW.binding,'$.source.version') AND a.browser_hash=json_extract(NEW.binding,'$.authority.browserHash') AND a.browser_epoch=json_extract(NEW.binding,'$.authority.browserEpoch') AND ((json_extract(NEW.binding,'$.operation')='callback' AND a.state='pending') OR (json_extract(NEW.binding,'$.operation')='retry' AND a.state='checking')))) OR (NEW.provider='openrouter' AND json_extract(NEW.binding,'$.source.kind')='openrouter-connection' AND json_extract(NEW.binding,'$.operation')='check' AND EXISTS(SELECT 1 FROM openrouter_connections c WHERE c.account_id=NEW.source_id AND c.account_id=NEW.account_id AND c.version=json_extract(NEW.binding,'$.source.version') AND c.epoch=json_extract(NEW.binding,'$.source.epoch') AND c.state='linked' AND c.credential_envelope IS NOT NULL)))),0)
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_credential_origin_adopt_insert BEFORE INSERT ON account_deletion_credential_origins
WHEN NEW.mode='native-v1' AND NOT (EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE u.id=NEW.use_id AND u.provider=NEW.provider AND u.result_account_id=NEW.account_id AND ((NEW.provider='google' AND NEW.credential_epoch IS NULL AND json_extract(u.binding,'$.source.kind')='google-attempt' AND EXISTS(SELECT 1 FROM google_auth_attempts a JOIN google_identities g ON g.account_id=NEW.account_id AND g.subject=json_extract(a.claims,'$.subject') WHERE a.id=u.source_id AND a.version>json_extract(u.binding,'$.source.version') AND a.state IN('verified','proof-required') AND a.browser_hash=json_extract(u.binding,'$.authority.browserHash') AND a.browser_epoch=json_extract(u.binding,'$.authority.browserEpoch') AND a.actor_account_id IS u.account_id AND a.actor_auth_version IS json_extract(u.binding,'$.authority.authVersion'))) OR (NEW.provider='openrouter' AND json_extract(u.binding,'$.source.kind')='openrouter-attempt' AND EXISTS(SELECT 1 FROM openrouter_attempts a JOIN openrouter_connections c ON c.account_id=a.account_id AND c.epoch=a.result_epoch WHERE a.id=u.source_id AND a.account_id=NEW.account_id AND a.state='completed' AND a.version>json_extract(u.binding,'$.source.version') AND c.epoch=NEW.credential_epoch AND c.state='linked' AND c.credential_envelope IS NOT NULL)))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_credential_origin_adopt_update BEFORE UPDATE ON account_deletion_credential_origins
WHEN NEW.mode='native-v1' AND NOT (EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE u.id=NEW.use_id AND u.provider=NEW.provider AND u.result_account_id=NEW.account_id AND ((NEW.provider='google' AND NEW.credential_epoch IS NULL AND json_extract(u.binding,'$.source.kind')='google-attempt' AND EXISTS(SELECT 1 FROM google_auth_attempts a JOIN google_identities g ON g.account_id=NEW.account_id AND g.subject=json_extract(a.claims,'$.subject') WHERE a.id=u.source_id AND a.version>json_extract(u.binding,'$.source.version') AND a.state IN('verified','proof-required') AND a.browser_hash=json_extract(u.binding,'$.authority.browserHash') AND a.browser_epoch=json_extract(u.binding,'$.authority.browserEpoch') AND a.actor_account_id IS u.account_id AND a.actor_auth_version IS json_extract(u.binding,'$.authority.authVersion'))) OR (NEW.provider='openrouter' AND json_extract(u.binding,'$.source.kind')='openrouter-attempt' AND EXISTS(SELECT 1 FROM openrouter_attempts a JOIN openrouter_connections c ON c.account_id=a.account_id AND c.epoch=a.result_epoch WHERE a.id=u.source_id AND a.account_id=NEW.account_id AND a.state='completed' AND a.version>json_extract(u.binding,'$.source.version') AND c.epoch=NEW.credential_epoch AND c.state='linked' AND c.credential_envelope IS NOT NULL)))))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_credential_origin_delete BEFORE DELETE ON account_deletion_credential_origins
WHEN OLD.mode!='native-v1' OR NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE u.id=OLD.use_id AND u.provider=OLD.provider AND u.result_account_id=OLD.account_id AND u.state='closed' AND u.caller_ended=1 AND u.acknowledged=1) OR (OLD.provider='google' AND EXISTS(SELECT 1 FROM google_identities WHERE account_id=OLD.account_id)) OR (OLD.provider='openrouter' AND EXISTS(SELECT 1 FROM openrouter_connections WHERE account_id=OLD.account_id AND (credential_envelope IS NOT NULL OR provider_user_id IS NOT NULL OR ever_linked_at IS NOT NULL)))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_ack_admission BEFORE INSERT ON account_deletion_drive_acknowledgments
WHEN NOT ((NEW.kind='authorization' AND EXISTS(SELECT 1 FROM drive_authorization_attempts d WHERE d.id=NEW.id AND d.account_id=NEW.account_id AND d.owner_state='closed' AND d.runtime_generation=NEW.runtime_generation AND d.owner_token=NEW.owner_token)) OR (NEW.kind='control' AND EXISTS(SELECT 1 FROM drive_control_operations d WHERE d.id=NEW.id AND d.account_id=NEW.account_id AND d.owner_state='closed' AND d.runtime_generation=NEW.runtime_generation AND d.owner_token=NEW.owner_token)) OR (NEW.kind='backup' AND EXISTS(SELECT 1 FROM drive_backup_transfers d WHERE d.id=NEW.id AND d.account_id=NEW.account_id AND d.owner_state='closed' AND d.runtime_generation=NEW.runtime_generation AND d.owner_token=NEW.owner_token)))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_ack_immutable BEFORE UPDATE ON account_deletion_drive_acknowledgments
WHEN NEW.kind IS NOT OLD.kind OR NEW.id IS NOT OLD.id OR NEW.account_id IS NOT OLD.account_id OR NEW.runtime_generation IS NOT OLD.runtime_generation OR NEW.owner_token IS NOT OLD.owner_token OR NEW.evidence_id IS NOT OLD.evidence_id
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_drive_ack_delete BEFORE DELETE ON account_deletion_drive_acknowledgments
WHEN (OLD.kind='authorization' AND EXISTS(SELECT 1 FROM drive_authorization_attempts WHERE id=OLD.id)) OR (OLD.kind='control' AND EXISTS(SELECT 1 FROM drive_control_operations WHERE id=OLD.id)) OR (OLD.kind='backup' AND EXISTS(SELECT 1 FROM drive_backup_transfers WHERE id=OLD.id))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_invitation_admission BEFORE INSERT ON workspace_invitations
WHEN NEW.state='pending' AND NOT (EXISTS(SELECT 1 FROM accounts a JOIN workspace_members m ON m.account_id=a.id JOIN workspaces w ON w.id=m.workspace_id WHERE a.id=NEW.issuer_id AND a.state='active' AND m.workspace_id=NEW.workspace_id AND m.role='owner' AND w.state='active'))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_invitation_claim BEFORE UPDATE ON workspace_invitations
WHEN NEW.state='pending' AND (NEW.issuer_id IS NOT OLD.issuer_id OR NEW.generation IS NOT OLD.generation OR (NEW.delivery_state='running' AND (NEW.delivery_state IS NOT OLD.delivery_state OR NEW.lease_token IS NOT OLD.lease_token))) AND NOT (EXISTS(SELECT 1 FROM accounts a JOIN workspace_members m ON m.account_id=a.id JOIN workspaces w ON w.id=m.workspace_id WHERE a.id=NEW.issuer_id AND a.state='active' AND m.workspace_id=NEW.workspace_id AND m.role='owner' AND w.state='active'))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_membership_admission BEFORE INSERT ON workspace_members
WHEN NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_membership_actor_update BEFORE UPDATE ON workspace_members
WHEN (NEW.account_id IS NOT OLD.account_id OR NEW.workspace_id IS NOT OLD.workspace_id OR NEW.role IS NOT OLD.role) AND NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_note_owner_insert BEFORE INSERT ON notes
WHEN NOT (((NEW.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=NEW.owner_workspace_id AND w.state='active')))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_note_owner_move BEFORE UPDATE ON notes
WHEN (NEW.owner_account_id IS NOT OLD.owner_account_id OR NEW.owner_workspace_id IS NOT OLD.owner_workspace_id) AND NOT (((NEW.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=NEW.owner_workspace_id AND w.state='active')) AND ((OLD.owner_workspace_id IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=OLD.owner_account_id AND a.state='active')) OR EXISTS(SELECT 1 FROM workspaces w WHERE w.id=OLD.owner_workspace_id AND w.state='active')))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_zip_run_claim BEFORE UPDATE ON zip_runs
WHEN NEW.state IN('running','assembling') AND (NEW.state IS NOT OLD.state OR NEW.lease_token IS NOT OLD.lease_token) AND NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_zip_delivery_claim BEFORE UPDATE ON zip_deliveries
WHEN NEW.state='sending' AND (NEW.state IS NOT OLD.state OR NEW.claim_token IS NOT OLD.claim_token) AND NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active')
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_intent_admission BEFORE INSERT ON account_deletions
WHEN NEW.version!=1 OR NEW.state!='queued' OR NEW.cursor_table!='personal-notes' OR NEW.cursor_after_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM accounts a WHERE a.id=NEW.account_id AND a.state='active' AND NEW.fence_auth_version=a.auth_version+1)
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_intent_identity BEFORE UPDATE ON account_deletions
WHEN NEW.id IS NOT OLD.id OR NEW.account_id IS NOT OLD.account_id OR NEW.fence_auth_version IS NOT OLD.fence_auth_version OR NEW.accepted_at IS NOT OLD.accepted_at OR NEW.version!=OLD.version+1 OR OLD.state='succeeded'
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_intent_anchor_delete BEFORE DELETE ON account_deletions
WHEN EXISTS(SELECT 1 FROM accounts a WHERE a.id=OLD.account_id AND a.deletion_id=OLD.id)
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_account_anchor_delete BEFORE DELETE ON accounts
WHEN OLD.state='deleted'
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_credential_result_once BEFORE UPDATE ON account_deletion_credential_uses
WHEN NEW.result_account_id IS NOT OLD.result_account_id AND NOT coalesce((OLD.result_account_id IS NULL AND NEW.result_account_id IS NOT NULL AND ((OLD.provider='google' AND json_extract(OLD.binding,'$.source.kind')='google-attempt' AND EXISTS(SELECT 1 FROM google_auth_attempts a JOIN google_identities g ON g.account_id=NEW.result_account_id AND g.subject=json_extract(a.claims,'$.subject') WHERE a.id=OLD.source_id AND a.state IN('verified','proof-required') AND a.version>json_extract(OLD.binding,'$.source.version') AND a.browser_hash=json_extract(OLD.binding,'$.authority.browserHash') AND a.browser_epoch=json_extract(OLD.binding,'$.authority.browserEpoch') AND a.actor_account_id IS OLD.account_id AND a.actor_auth_version IS json_extract(OLD.binding,'$.authority.authVersion'))) OR (OLD.provider='openrouter' AND json_extract(OLD.binding,'$.source.kind')='openrouter-attempt' AND NEW.result_account_id=OLD.account_id AND EXISTS(SELECT 1 FROM openrouter_attempts a JOIN openrouter_connections c ON c.account_id=a.account_id AND c.epoch=a.result_epoch WHERE a.id=OLD.source_id AND a.state='completed' AND a.version>json_extract(OLD.binding,'$.source.version') AND a.account_id=OLD.account_id AND a.auth_version=json_extract(OLD.binding,'$.authority.authVersion') AND a.browser_hash=json_extract(OLD.binding,'$.authority.browserHash') AND a.browser_epoch=json_extract(OLD.binding,'$.authority.browserEpoch') AND c.credential_envelope IS NOT NULL)))),0)
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_google_identity_retirement_cleanup BEFORE DELETE ON google_identities
WHEN EXISTS(SELECT 1 FROM accounts a WHERE a.id=OLD.account_id AND a.state='deleted') AND NOT (EXISTS(SELECT 1 FROM account_deletion_credential_origins o JOIN account_deletion_credential_uses u ON u.id=o.use_id WHERE o.provider='google' AND o.account_id=OLD.account_id AND o.mode='native-v1' AND u.provider=o.provider AND u.result_account_id=o.account_id AND u.state='closed' AND u.caller_ended=1 AND u.acknowledged=1) AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE u.provider='google' AND (u.account_id=OLD.account_id OR u.result_account_id=OLD.account_id OR u.account_id IS NULL) AND (u.state!='closed' OR u.caller_ended!=1 OR u.acknowledged!=1)) AND NOT EXISTS(SELECT 1 FROM google_auth_attempts a WHERE a.state!='pending' AND NOT EXISTS(SELECT 1 FROM account_deletion_credential_uses u WHERE u.provider='google' AND u.source_id=a.id)))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TRIGGER p5d_openrouter_origin_retirement_cleanup BEFORE UPDATE ON openrouter_connections
WHEN OLD.credential_envelope IS NOT NULL AND NEW.credential_envelope IS NULL AND EXISTS(SELECT 1 FROM accounts a WHERE a.id=OLD.account_id AND a.state='deleted') AND NOT (EXISTS(SELECT 1 FROM account_deletion_credential_origins o JOIN account_deletion_credential_uses u ON u.id=o.use_id WHERE o.provider='openrouter' AND o.account_id=OLD.account_id AND o.mode='native-v1' AND o.credential_epoch=OLD.epoch AND u.provider=o.provider AND u.result_account_id=o.account_id AND u.state='closed' AND u.caller_ended=1 AND u.acknowledged=1))
BEGIN SELECT RAISE(ABORT,'ACCOUNT_DELETION_FENCED'); END;
--> statement-breakpoint
CREATE TEMP TABLE __p5d_foreign_key_guard (violations INTEGER NOT NULL CHECK(violations=0));
--> statement-breakpoint
INSERT INTO __p5d_foreign_key_guard SELECT count(*) FROM pragma_foreign_key_check;
--> statement-breakpoint
DROP TABLE __p5d_foreign_key_guard;
