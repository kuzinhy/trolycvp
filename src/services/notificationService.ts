import axios from 'axios';

class NotificationService {
  private publicVapidKey: string | null = null;

  async getVapidKey() {
    if (this.publicVapidKey) return this.publicVapidKey;
    try {
      const response = await axios.get('/api/notifications/vapid-key');
      this.publicVapidKey = response.data.publicKey;
      return this.publicVapidKey;
    } catch (error) {
      console.error('Failed to get VAPID key:', error);
      return null;
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.error('This browser does not support notifications');
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      await this.subscribeUser();
    }
    return permission;
  }

  async subscribeUser() {
    const registration = await navigator.serviceWorker.ready;
    const vapidKey = await this.getVapidKey();

    if (!vapidKey) return;

    try {
      // Check if already subscribed
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Subscribe to push service
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
        });
      }

      // Send subscription to server
      await axios.post('/api/notifications/subscribe', subscription);
      console.log('Successfully subscribed to Push Notifications');
      return true;
    } catch (error) {
      console.error('Failed to subscribe user:', error);
      return false;
    }
  }

  async sendTestNotification(title: string, body: string) {
    try {
      await axios.post('/api/notifications/send', {
        title,
        body,
        url: window.location.origin
      });
      return true;
    } catch (error) {
      console.error('Failed to send test notification:', error);
      return false;
    }
  }

  private urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async isSubscribed(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      return false;
    }
    
    if (Notification.permission !== 'granted') {
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  }
}

export const notificationService = new NotificationService();
