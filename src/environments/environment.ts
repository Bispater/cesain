/**
 * Configuración del entorno. Para activar Firebase, completa estos valores con
 * los de tu proyecto "cesain-web" (Consola Firebase → Configuración del proyecto
 * → Tus apps → SDK setup and configuration).
 *
 * Luego, en app.config.ts cambia el proveedor de PRESTACION_REPOSITORY de
 * LocalPrestacionRepository a FirestorePrestacionRepository.
 */
export const environment = {
  production: false,
  /**
   * true  = usa Cloud Firestore (proyecto cesain-web).
   * false = usa localStorage (sin backend).
   */
  usarFirebase: true,
  firebase: {
    apiKey: 'AIzaSyBp66NYbLcKP2DPiA_ew_FSZzs_C_ofVk0',
    authDomain: 'cesain-web.firebaseapp.com',
    projectId: 'cesain-web',
    storageBucket: 'cesain-web.firebasestorage.app',
    messagingSenderId: '1045302485152',
    appId: '1:1045302485152:web:fdbbc70d9036c0e4c529c5',
    measurementId: 'G-TEG9M1WBHM',
    // Realtime Database (confirmar la URL al crear la instancia por defecto):
    databaseURL: 'https://cesain-web-default-rtdb.firebaseio.com',
  },
};
