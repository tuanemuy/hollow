import { createServerFn } from "@tanstack/react-start";
import { accountDeletionSchema } from "./accountDeletionInput";
import { errorResponseMiddleware } from "./errorResponseMiddleware";
import { validateInput } from "./validator";

export const deleteAccountFn = createServerFn({ method: "POST" })
  .middleware([errorResponseMiddleware])
  .inputValidator(validateInput(accountDeletionSchema))
  .handler(async ({ data }) => {
    const [{ hollowContext, removeSession }, { deleteAccount }] =
      await Promise.all([
        import("./hollowServer"),
        import("@repo/core/application/account/deletion"),
      ]);
    const { container, token } = await hollowContext(true);
    const result = await deleteAccount(container, token, data);
    removeSession();
    return result;
  });
