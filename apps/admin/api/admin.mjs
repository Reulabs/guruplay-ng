import adminHandler from "../server/admin-api.mjs";
import { restoreApiUrl } from "../../web/server/vercel-routing.mjs";

export default function handler(req, res) {
  req.url = restoreApiUrl(req.url, {
    apiPrefix: "/api/admin/",
    functionPath: "/api/admin",
  });
  return adminHandler(req, res);
}

export const config = { api: { bodyParser: false } };
