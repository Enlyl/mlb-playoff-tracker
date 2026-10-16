// Browser Notification service for game events

class NotificationService {
  private sentAlertKeys = new Set<string>();

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'Notification' in window;
  }

  public getPermission(): NotificationPermission {
    if (!this.isSupported()) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<boolean> {
    if (!this.isSupported()) return false;
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch {
      return false;
    }
  }

  public sendNotification(title: string, options?: NotificationOptions & { alertKey?: string }): void {
    if (!this.isSupported() || Notification.permission !== 'granted') return;

    if (options?.alertKey) {
      if (this.sentAlertKeys.has(options.alertKey)) return;
      this.sentAlertKeys.add(options.alertKey);
    }

    try {
      new Notification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        ...options,
      });
    } catch (e) {
      console.warn('Notification failed:', e);
    }
  }

  public alertScoreChange(teamName: string, opponentName: string, newScore: string, inning: string): void {
    const key = `score-${teamName}-${newScore}-${inning}`;
    this.sendNotification(`⚾ Изменение счета: ${teamName}`, {
      body: `${teamName} vs ${opponentName}: ${newScore} (${inning})`,
      alertKey: key,
    });
  }

  public alertGameStart(homeTeam: string, awayTeam: string): void {
    const key = `start-${homeTeam}-${awayTeam}-${new Date().toDateString()}`;
    this.sendNotification(`⚾ Матч начался!`, {
      body: `${awayTeam} против ${homeTeam}. Игра в прямом эфире!`,
      alertKey: key,
    });
  }

  public alertHomeRun(batterName: string, teamName: string, rbi: number): void {
    const key = `hr-${batterName}-${Date.now()}`;
    this.sendNotification(`🔥 ХОУМ-РАН! (${teamName})`, {
      body: `${batterName} выбивает мяч за пределы поля! (+${rbi} RBI)`,
      alertKey: key,
    });
  }
}

export const notifications = new NotificationService();
