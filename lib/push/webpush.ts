import webpush from "web-push";
import { prisma } from "@/lib/prisma";

let initialized = false;

function initWebPush() {
  if (initialized) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) return;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  initialized = true;
}

export async function notifyRoles(roleIds: string[], payload: { title: string; body: string }) {
  initWebPush();
  if (!initialized || roleIds.length === 0) return;

  const subs = await prisma.pushSubscription.findMany({ where: { roleId: { in: roleIds } } });

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth
            }
          },
          JSON.stringify(payload)
        );
      } catch {
        await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null);
      }
    })
  );
}
