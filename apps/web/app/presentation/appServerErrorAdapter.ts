import { createSerializationAdapter } from "@tanstack/react-router";
import {
  AppServerError,
  isAppServerError,
  redactForClient,
  type SerializedError,
} from "./errorResponse";

export const appServerErrorAdapter = createSerializationAdapter<
  AppServerError,
  SerializedError
>({
  key: "AppServerError",
  test: isAppServerError,
  toSerializable: (value) => redactForClient(value.serialized),
  fromSerializable: (value) => new AppServerError(value),
});
