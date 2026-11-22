'use client';

import { useEffect } from 'react';
import { mountAchievementApp } from '../lib/controller';

export default function AchievementClient() {
  useEffect(() => mountAchievementApp(), []);
  return <div id="app"><main className="quest-hero" role="status">
    <div className="card-label">ACHIEVEMENT UNLOCKED</div>
    <h1>正在打开任务板…</h1>
  </main></div>;
}
