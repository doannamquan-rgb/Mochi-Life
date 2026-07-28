'use client'

export default function OfflinePage() {
  return (
    <div className="offline-page">
      <div className="offline-card animate-bounce-in">
        <span className="mascot animate-float">🐱</span>
        <h1>Bạn đang ở chế độ Ngoại tuyến</h1>
        <p>Mochi Life không thể kết nối mạng lúc này. Vui lòng kiểm tra lại kết nối Wi-Fi hoặc 3G/4G của bạn.</p>
        <button
          className="mochi-btn mochi-btn-primary mochi-btn-lg"
          onClick={() => window.location.reload()}
        >
          🔄 Tải lại trang
        </button>
      </div>

      <style jsx>{`
        .offline-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--cream);
          padding: 20px;
        }
        .offline-card {
          background: white;
          border-radius: 24px;
          padding: 40px 24px;
          max-width: 440px;
          width: 100%;
          text-align: center;
          box-shadow: var(--shadow-lg);
          border: 1.5px solid var(--chocolate-100);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }
        .mascot {
          font-size: 4rem;
        }
        h1 {
          font-size: 1.3rem;
          font-weight: 800;
          color: var(--chocolate-600);
          margin: 0;
        }
        p {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--chocolate-400);
          line-height: 1.5;
          margin: 0;
        }
      `}</style>
    </div>
  )
}
