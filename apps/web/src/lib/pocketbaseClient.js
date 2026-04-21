import Pocketbase from 'pocketbase';

const POCKETBASE_API_URL = "https://martcom-validaciones-validacion.mchc0z.easypanel.host";

const pocketbaseClient = new Pocketbase(POCKETBASE_API_URL);

export default pocketbaseClient;

export { pocketbaseClient };
