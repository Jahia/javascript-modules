import {Bundle} from 'org.osgi.framework';

/**
 * The global declarations, where top-level objects are exposed to server-side scripts
 */
declare global {
    /**
     * Exposed only during the server-side initial script registration process, not available during rendering
     */
    export const bundle : Bundle;
}
