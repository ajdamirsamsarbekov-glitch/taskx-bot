'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeTasks: 0,
    completedTasks: 0,
    totalRevenue: 0,
    openDisputes: 0,
  });

  const [disputes, setDisputes] = useState([]);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'disputes' | 'users' | 'settings'>('dashboard');

  useEffect(() => {
    // Mock data - в production подключить к API
    setStats({
      totalUsers: 1234,
      activeTasks: 56,
      completedTasks: 789,
      totalRevenue: 234567,
      openDisputes: 12,
    });
  }, []);

  const resolveDispute = async (disputeId: string, resolution: string, amount?: string) => {
    try {
      // await axios.post(`${API_URL}/admin/disputes/${disputeId}/resolve`, {
      //   resolution,
      //   amount,
      // });
      alert(`Спор ${disputeId} разрешён: ${resolution}`);
      setSelectedDispute(null);
    } catch (error) {
      console.error('Error resolving dispute:', error);
    }
  };

  return (
    <div style={styles.container}>
      <aside style={styles.sidebar}>
        <h1 style={styles.logo}>TaskX Admin</h1>
        <nav style={styles.nav}>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'dashboard' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Dashboard
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'disputes' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('disputes')}
          >
            ⚖️ Споры ({stats.openDisputes})
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'users' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('users')}
          >
            👥 Пользователи
          </button>
          <button
            style={{
              ...styles.navButton,
              ...(activeTab === 'settings' ? styles.navButtonActive : {}),
            }}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Настройки
          </button>
        </nav>
      </aside>

      <main style={styles.main}>
        {activeTab === 'dashboard' && (
          <div>
            <h2 style={styles.pageTitle}>Dashboard</h2>

            <div style={styles.statsGrid}>
              <div style={styles.statCard}>
                <div style={styles.statIcon}>👥</div>
                <div style={styles.statValue}>{stats.totalUsers}</div>
                <div style={styles.statLabel}>Пользователей</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>📋</div>
                <div style={styles.statValue}>{stats.activeTasks}</div>
                <div style={styles.statLabel}>Активных заданий</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>✅</div>
                <div style={styles.statValue}>{stats.completedTasks}</div>
                <div style={styles.statLabel}>Завершено</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>💰</div>
                <div style={styles.statValue}>{stats.totalRevenue.toLocaleString()} сом</div>
                <div style={styles.statLabel}>Доход платформы</div>
              </div>

              <div style={styles.statCard}>
                <div style={styles.statIcon}>⚖️</div>
                <div style={styles.statValue}>{stats.openDisputes}</div>
                <div style={styles.statLabel}>Открытых споров</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'disputes' && (
          <div>
            <h2 style={styles.pageTitle}>Управление спорами</h2>

            {selectedDispute ? (
              <div style={styles.disputeDetail}>
                <button
                  style={styles.backButton}
                  onClick={() => setSelectedDispute(null)}
                >
                  ← Назад
                </button>

                <h3 style={styles.disputeTitle}>Спор #{selectedDispute.id}</h3>

                <div style={styles.disputeSection}>
                  <h4>Задание</h4>
                  <p>{selectedDispute.taskTitle}</p>
                  <p>Цена: {selectedDispute.price} сом</p>
                </div>

                <div style={styles.disputeSection}>
                  <h4>Причина спора</h4>
                  <p>{selectedDispute.reason}</p>
                </div>

                <div style={styles.disputeSection}>
                  <h4>Доказательства заказчика</h4>
                  <p>{selectedDispute.clientEvidence || 'Нет доказательств'}</p>
                </div>

                <div style={styles.disputeSection}>
                  <h4>Доказательства исполнителя</h4>
                  <p>{selectedDispute.executorEvidence || 'Нет доказательств'}</p>
                </div>

                <div style={styles.disputeActions}>
                  <button
                    style={{ ...styles.actionButton, ...styles.successButton }}
                    onClick={() => resolveDispute(selectedDispute.id, 'FAVOR_EXECUTOR')}
                  >
                    В пользу исполнителя
                  </button>
                  <button
                    style={{ ...styles.actionButton, ...styles.dangerButton }}
                    onClick={() => resolveDispute(selectedDispute.id, 'FAVOR_CLIENT')}
                  >
                    В пользу заказчика
                  </button>
                  <button
                    style={{ ...styles.actionButton, ...styles.warningButton }}
                    onClick={() => resolveDispute(selectedDispute.id, 'SPLIT')}
                  >
                    50/50
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.disputeList}>
                <div style={styles.card}>
                  <h3>Спор #1</h3>
                  <p>Задание: Купить сендвич</p>
                  <p>Статус: Открыт</p>
                  <button
                    style={styles.viewButton}
                    onClick={() =>
                      setSelectedDispute({
                        id: '1',
                        taskTitle: 'Купить сендвич',
                        price: '100',
                        reason: 'Исполнитель не доставил сендвич',
                        clientEvidence: 'Не получил заказ',
                        executorEvidence: 'Доставил по адресу',
                      })
                    }
                  >
                    Рассмотреть
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 style={styles.pageTitle}>Пользователи</h2>
            <div style={styles.card}>
              <p>Функционал управления пользователями в разработке</p>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 style={styles.pageTitle}>Настройки платформы</h2>

            <div style={styles.card}>
              <h3>Комиссия платформы</h3>
              <input
                type="number"
                defaultValue={30}
                style={styles.input}
              />
              <p style={styles.hint}>Текущая комиссия: 30%</p>
            </div>

            <div style={styles.card}>
              <h3>Автозавершение заданий</h3>
              <input
                type="number"
                defaultValue={24}
                style={styles.input}
              />
              <p style={styles.hint}>Часов после отправки результата</p>
            </div>

            <button style={styles.saveButton}>Сохранить изменения</button>
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    minHeight: '100vh',
  },
  sidebar: {
    width: '250px',
    backgroundColor: '#2c3e50',
    color: '#fff',
    padding: '20px',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '40px',
  },
  nav: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  navButton: {
    padding: '12px 16px',
    backgroundColor: 'transparent',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    textAlign: 'left' as const,
    fontSize: '16px',
    transition: 'background 0.2s',
  },
  navButtonActive: {
    backgroundColor: '#34495e',
  },
  main: {
    flex: 1,
    padding: '40px',
    overflowY: 'auto' as const,
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '30px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    textAlign: 'center' as const,
  },
  statIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  statLabel: {
    fontSize: '14px',
    color: '#666',
  },
  card: {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    marginBottom: '20px',
  },
  disputeList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  disputeDetail: {
    backgroundColor: '#fff',
    padding: '32px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: '8px 16px',
    backgroundColor: '#e0e0e0',
    border: 'none',
    borderRadius: '6px',
    marginBottom: '20px',
  },
  disputeTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '24px',
  },
  disputeSection: {
    marginBottom: '24px',
  },
  disputeActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '32px',
  },
  actionButton: {
    flex: 1,
    padding: '12px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
  },
  successButton: {
    backgroundColor: '#27ae60',
  },
  dangerButton: {
    backgroundColor: '#e74c3c',
  },
  warningButton: {
    backgroundColor: '#f39c12',
  },
  viewButton: {
    padding: '8px 16px',
    backgroundColor: '#3498db',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    marginTop: '12px',
  },
  input: {
    width: '200px',
    padding: '10px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  hint: {
    fontSize: '14px',
    color: '#666',
  },
  saveButton: {
    padding: '12px 32px',
    backgroundColor: '#27ae60',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '20px',
  },
};
