import webpush from "web-push";

// Genera un par de claves VAPID para notificaciones push (webpush).
// Uso: npm run webpush:keys
const { publicKey, privateKey } = webpush.generateVAPIDKeys();

console.log("Agrega esto a tu .env.local:\n");
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_SUBJECT=mailto:soporte@localizadosvenezuela.com`);
