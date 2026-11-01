import "../../../packages/common/server/env.mjs";
import musicApi from "../server/music-api.mjs";
import { restoreApiUrl } from "../server/vercel-routing.mjs";

export default function handler(req, res) {
  req.url = restoreApiUrl(req.url);
  return musicApi(req, res);
}

export const config = { api: { bodyParser: false } };
