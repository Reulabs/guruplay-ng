import '../../../../packages/common/server/env.mjs';
import musicApi from '../../../web/server/music-api.mjs';

export default musicApi;

export const config = { api: { bodyParser: false } };
