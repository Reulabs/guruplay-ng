import { useEffect } from "react";
import { APP_NAME } from "@guruplay/common/brand";

export const useDocumentTitle = (title?: string) => {
  useEffect(() => {
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;
  }, [title]);
};
