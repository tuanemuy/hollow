DROP TRIGGER auth_attempt_shape_insert;
--> statement-breakpoint
DROP TRIGGER auth_attempt_shape_update;
--> statement-breakpoint
CREATE TRIGGER auth_attempt_shape_insert BEFORE INSERT ON google_auth_attempts
WHEN NOT coalesce(
 NEW.mode IN ('login','link','reauth') AND NEW.state IN ('pending','exchanging','verified','proof-required','reauth-ready','completed','failed')
 AND NEW.browser_epoch BETWEEN 1 AND 9007199254740991 AND NEW.version BETWEEN 1 AND 9007199254740991
 AND ((NEW.actor_account_id IS NULL AND NEW.actor_session_hash IS NULL AND NEW.actor_auth_version IS NULL AND NEW.mode='login') OR (NEW.actor_account_id IS NOT NULL AND NEW.actor_session_hash IS NOT NULL AND NEW.actor_auth_version IS NOT NULL AND NEW.actor_auth_version>=1))
 AND ((NEW.target_account_id IS NULL AND NEW.target_auth_version IS NULL AND NEW.state!='proof-required') OR (NEW.target_account_id IS NOT NULL AND NEW.target_auth_version IS NOT NULL AND NEW.target_auth_version>=1 AND NEW.state IN ('verified','proof-required')))
 AND ((NEW.state='completed' AND NEW.result_account_id IS NOT NULL) OR (NEW.state!='completed' AND NEW.result_account_id IS NULL))
 AND ((NEW.state='failed' AND NEW.failure IN ('AUTH_EXPIRED','AUTH_CONTEXT_CHANGED','AUTH_EXCHANGE_UNKNOWN','AUTH_CANCELLED','AUTH_PROVIDER_REJECTED','AUTH_UNVERIFIED','AUTH_CONFLICT')) OR (NEW.state!='failed' AND NEW.failure IS NULL))
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
 AND ((NEW.state='failed' AND NEW.failure IN ('AUTH_EXPIRED','AUTH_CONTEXT_CHANGED','AUTH_EXCHANGE_UNKNOWN','AUTH_CANCELLED','AUTH_PROVIDER_REJECTED','AUTH_UNVERIFIED','AUTH_CONFLICT')) OR (NEW.state!='failed' AND NEW.failure IS NULL))
 AND json_valid(NEW.return_to) AND (NEW.claims IS NULL OR json_valid(NEW.claims)),0)
BEGIN SELECT RAISE(ABORT,'AUTH_ATTEMPT_SHAPE'); END;
