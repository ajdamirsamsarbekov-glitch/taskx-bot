'use client';

import { useEffect, useState } from 'react';
import { useStore, useTaskStore } from '@/store';
import { authApi, walletApi, taskApi } from '@/lib/api';

declare global {
  interface Window {
    Telegram?: {
      WebApp: any;
    };
  }
}

export default function Home() {
  const { user, wallet, setUser, setWallet, setToken } = useStore();
  const { tasks, setTasks } = useTaskStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tasks' | 'my' | 'wallet' | 'profile'>('tasks');

  useEffect(() => {
    const initApp = async () => {
      try {
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
          const tg = window.Telegram.WebApp;
          tg.ready();
          tg.expand();

          const initData = tg.initData;

          if (initData) {
            const { data } = await authApi.authenticateTelegram(initData);
            setToken(data.token);
            setUser(data.user);

            const walletRes = await walletApi.getWallet();
            setWallet(walletRes.data);

            const tasksRes = await taskApi.getTasks();
            setTasks(tasksRes.data);
          }
        }
      } catch (error) {
        console.error('Init error:', error);
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>TaskX</h1>
        {wallet && (
          <div style={styles.balance}>
            <div>💰 {wallet.availableBalance} сом</div>
            {parseFloat(wallet.frozenBalance) > 0 && (
              <div style={styles.frozen}>🔒 {wallet.frozenBalance} сом</div>
            )}
          </div>
        )}
      </header>

      <nav style={styles.nav}>
        <button
          style={{
            ...styles.navButton,
            ...(activeTab === 'tasks' ? styles.navButtonActive : {}),
          }}
          onClick={() => setActiveTab('tasks')}
        >
          🔍 Задания
        </button>
        <button
          style={{
            ...styles.navButton,
            ...(activeTab === 'my' ? styles.navButtonActive : {}),
          }}
          onClick={() => setActiveTab('my')}
        >
          📝 Мои
        </button>
        <button
          style={{
            ...styles.navButton,
            ...(activeTab === 'wallet' ? styles.navButtonActive : {}),
          }}
          onClick={() => setActiveTab('wallet')}
        >
          💰 Кошелёк
        </button>
        <button
          style={{
            ...styles.navButton,
            ...(activeTab === 'profile' ? styles.navButtonActive : {}),
          }}
          onClick={() => setActiveTab('profile')}
        >
          👤 Профиль
        </button>
      </nav>

      <main style={styles.main}>
        {activeTab === 'tasks' && (
          <div>
            <div style={styles.sectionHeader}>
              <h2>🔥 Доступные задания</h2>
              <button style={styles.createButton}>➕ Создать</button>
            </div>

            {tasks.length === 0 ? (
              <div style={styles.empty}>Нет доступных заданий</div>
            ) : (
              <div style={styles.taskList}>
                {tasks.map((task) => (
                  <div key={task.id} style={styles.taskCard}>
                    <h3 style={styles.taskTitle}>{task.title}</h3>
                    <p style={styles.taskDescription}>{task.description}</p>
                    <div style={styles.taskMeta}>
                      <span>💰 {task.price} сом</span>
                      <span>📍 {task.category}</span>
                    </div>
                    <button style={styles.taskButton}>Подробнее</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'my' && (
          <div>
            <h2>📝 Мои задания</h2>
            <div style={styles.empty}>У вас пока нет заданий</div>
          </div>
        )}

        {activeTab === 'wallet' && wallet && (
          <div>
            <h2>💰 Кошелёк</h2>
            <div style={styles.walletCard}>
              <div style={styles.walletRow}>
                <span>Доступно:</span>
                <span style={styles.walletAmount}>{wallet.availableBalance} сом</span>
              </div>
              <div style={styles.walletRow}>
                <span>Заморожено:</span>
                <span style={styles.walletAmount}>{wallet.frozenBalance} сом</span>
              </div>
              <div style={styles.walletRow}>
                <span>Всего заработано:</span>
                <span style={styles.walletAmount}>{wallet.earnedTotal} сом</span>
              </div>
              <div style={styles.walletRow}>
                <span>Всего потрачено:</span>
                <span style={styles.walletAmount}>{wallet.spentTotal} сом</span>
              </div>
            </div>

            <div style={styles.walletActions}>
              <button style={styles.actionButton}>Пополнить</button>
              <button style={styles.actionButton}>Вывести</button>
            </div>
          </div>
        )}

        {activeTab === 'profile' && user && (
          <div>
            <h2>👤 Профиль</h2>
            <div style={styles.profileCard}>
              <div style={styles.profileRow}>
                <span>ID:</span>
                <span>{user.publicUsername}</span>
              </div>
              <div style={styles.profileRow}>
                <span>Рейтинг:</span>
                <span>⭐ {user.rating}</span>
              </div>
              <div style={styles.profileRow}>
                <span>Выполнено заданий:</span>
                <span>{user.completedTasks}</span>
              </div>
              <div style={styles.profileRow}>
                <span>Создано заданий:</span>
                <span>{user.createdTasks}</span>
              </div>
              <div style={styles.profileRow}>
                <span>Успешность:</span>
                <span>{user.successRate}%</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: 'var(--tg-theme-bg-color, #ffffff)',
    color: 'var(--tg-theme-text-color, #000000)',
  },
  header: {
    padding: '16px',
    borderBottom: '1px solid var(--tg-theme-hint-color, #ccc)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
  },
  balance: {
    textAlign: 'right' as const,
    fontSize: '14px',
  },
  frozen: {
    fontSize: '12px',
    color: 'var(--tg-theme-hint-color, #999)',
    marginTop: '4px',
  },
  nav: {
    display: 'flex',
    borderBottom: '1px solid var(--tg-theme-hint-color, #ccc)',
    backgroundColor: 'var(--tg-theme-secondary-bg-color, #f5f5f5)',
  },
  navButton: {
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    color: 'var(--tg-theme-text-color, #000000)',
  },
  navButtonActive: {
    borderBottom: '2px solid var(--tg-theme-button-color, #3390ec)',
    fontWeight: 'bold',
  },
  main: {
    padding: '16px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '32px',
    fontSize: '18px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  createButton: {
    padding: '8px 16px',
    backgroundColor: 'var(--tg-theme-button-color, #3390ec)',
    color: 'var(--tg-theme-button-text-color, #ffffff)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  taskCard: {
    padding: '16px',
    backgroundColor: 'var(--tg-theme-secondary-bg-color, #f5f5f5)',
    borderRadius: '12px',
    border: '1px solid var(--tg-theme-hint-color, #ccc)',
  },
  taskTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  taskDescription: {
    fontSize: '14px',
    color: 'var(--tg-theme-hint-color, #999)',
    marginBottom: '12px',
  },
  taskMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '14px',
    marginBottom: '12px',
  },
  taskButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: 'var(--tg-theme-button-color, #3390ec)',
    color: 'var(--tg-theme-button-text-color, #ffffff)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '32px',
    color: 'var(--tg-theme-hint-color, #999)',
  },
  walletCard: {
    padding: '16px',
    backgroundColor: 'var(--tg-theme-secondary-bg-color, #f5f5f5)',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  walletRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid var(--tg-theme-hint-color, #ccc)',
  },
  walletAmount: {
    fontWeight: 'bold',
  },
  walletActions: {
    display: 'flex',
    gap: '12px',
  },
  actionButton: {
    flex: 1,
    padding: '12px',
    backgroundColor: 'var(--tg-theme-button-color, #3390ec)',
    color: 'var(--tg-theme-button-text-color, #ffffff)',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  profileCard: {
    padding: '16px',
    backgroundColor: 'var(--tg-theme-secondary-bg-color, #f5f5f5)',
    borderRadius: '12px',
  },
  profileRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 0',
    borderBottom: '1px solid var(--tg-theme-hint-color, #ccc)',
  },
};
