import '../../../../packages/common/server/env.mjs';
import musicApi from '../../server/music-api.mjs';

export default musicApi;

export const config = { api: { bodyParser: false } };
