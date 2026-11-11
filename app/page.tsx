import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowUpRight, ArrowRight, BookOpen, Check, Heart, Sparkles, Target, Wallet, Cat, Leaf, Flame } from 'lucide-react'
import styles from './landing.module.css'

export const metadata: Metadata = {
  title: 'Mochi Life — Từng bước nhỏ, một cuộc sống tốt hơn',
  description: 'Theo dõi mục tiêu, học HSK, chăm sóc sức khỏe và quản lý chi tiêu cùng Mochi Life. Khám phá định hướng AI đang phát triển.',
  openGraph: { title: 'Mochi Life — Từng bước nhỏ, một cuộc sống tốt hơn', description: 'Một không gian cho mục tiêu, tiếng Trung, sức khỏe và chi tiêu của bạn.', type: 'website', locale: 'vi_VN' },
}

const features = [
  { icon: Target, name: 'Goal Tracking', title: 'Mục tiêu lớn, bước đi nhỏ.', description: 'Sắp xếp việc cần làm mỗi ngày, theo dõi tiến độ và duy trì động lực qua streak, XP cùng các cột mốc thành tích.', tag: 'Mỗi ngày một chút', tone: 'peach' },
  { icon: BookOpen, name: 'HSK Learning', title: 'Tiếng Trung, gần hơn mỗi ngày.', description: 'Học theo cấp độ HSK, ôn từ vựng với flashcard lặp lại ngắt quãng, luyện quiz và khám phá ngữ pháp.', tag: 'Học · Ôn tập · Ghi nhớ', tone: 'lavender' },
  { icon: Heart, name: 'Wellness', title: 'Lắng nghe cơ thể của bạn.', description: 'Ghi lại cân nặng và các buổi tập, theo dõi mục tiêu sức khỏe để hiểu hành trình của mình rõ hơn.', tag: 'Chăm sóc bản thân', tone: 'mint' },
  { icon: Wallet, name: 'Expense Tracking', title: 'Chi tiêu có chủ đích hơn.', description: 'Quản lý ví, ghi thu chi, phân loại giao dịch và theo dõi ngân sách tháng trong một không gian gọn gàng.', tag: 'Hiểu tiền của mình', tone: 'yellow' },
]

export default function HomePage() {
  return <div className={styles.page}>
    <a className={styles.skip} href="#main">Đến nội dung chính</a>
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Mochi Life — Trang chủ"><span className={styles.logo}><Cat size={25} /></span>Mochi Life<span className={styles.brandDot}>.</span></Link>
      <nav className={styles.nav} aria-label="Điều hướng trang chủ"><a href="#features">Tính năng</a><a href="#approach">Cách Mochi đồng hành</a><a href="#ai">Mochi AI <span className={styles.navDot} /></a></nav>
      <Link href="/login" className={styles.login}>Login <ArrowUpRight size={17} /></Link>
    </header>
    <main id="main">
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><span /> MỘT KHÔNG GIAN, NHIỀU ĐIỀU TỐT ĐẸP</span>
          <h1>Từng bước nhỏ.<br />Một cuộc sống<br /><span>tốt hơn.</span><span className={styles.titleSpark}>✳</span></h1>
          <p>Mục tiêu, tiếng Trung, sức khỏe và chi tiêu — cùng nhau trong Mochi Life. Để chăm sóc bản thân trở thành một phần dễ thương của mỗi ngày.</p>
          <div className={styles.actions}><Link href="/login" className={styles.primary}>Bắt đầu cùng Mochi <ArrowRight size={19} /></Link><a href="#features" className={styles.secondary}>Khám phá tính năng <ArrowUpRight size={18} /></a></div>
          <div className={styles.heroNote}><Cat size={19} /> Không cần hoàn hảo. Chỉ cần bắt đầu.</div>
        </div>
        <div className={styles.heroVisual}>
          <div className={styles.orbit} aria-hidden="true" />
          <span className={styles.floatingNote}><Leaf size={17} /> Grow at your own pace</span>
          <div className={styles.preview}>
            <div className={styles.previewTop}><span>● MOCHI SPACE</span><span className={styles.demo}>Minh họa</span></div>
            <div className={styles.greeting}><div><p>MỘT NGÀY MỚI, MỘT BƯỚC NHỎ</p><h2>Chào bạn, cùng tiến lên nhé!</h2></div><span className={styles.sun} aria-hidden="true">☀</span></div>
            <div className={styles.previewGrid}>
              <div className={styles.goalPreview}><span><Target size={17} /> Mục tiêu hôm nay</span><strong>Chăm chút cho mình</strong><div className={styles.task}><span><Check size={12} /></span> Ôn 10 từ vựng HSK</div><div className={styles.task}><span><Check size={12} /></span> Vận động 20 phút</div><div className={styles.task}><i /> Ghi lại chi tiêu hôm nay</div><div className={styles.progress}><span /></div><small>Từng việc nhỏ đều đáng ghi nhận.</small></div>
              <div className={styles.wordPreview}><BookOpen size={19} /><span>HSK · TỪ VỰNG</span><strong lang="zh">成长</strong><span>chéng zhǎng</span><p>Trưởng thành</p></div>
            </div>
            <div className={styles.previewBottom}><span><Flame size={18} /> Nuôi dưỡng thói quen</span><span><Heart size={17} /> Dành thời gian cho bạn</span></div>
          </div>
          <div className={styles.mascot} aria-hidden="true"><Cat size={110} strokeWidth={1.2} /></div><span className={styles.mascotNote}>Bạn làm tốt lắm!</span><span className={styles.visualStar} aria-hidden="true">✦</span>
        </div>
      </section>
      <div className={styles.strip}><span>MỘT NHỊP SỐNG CÂN BẰNG HƠN</span><span><Target size={17} /> Mục tiêu</span><span><BookOpen size={17} /> Học tập</span><span><Heart size={17} /> Sức khỏe</span><span><Wallet size={17} /> Tài chính</span></div>
      <section id="features" className={styles.features}>
        <div className={styles.sectionHeading}><div><span className={styles.eyebrow}>DÀNH CHỖ CHO NHỮNG ĐIỀU QUAN TRỌNG</span><h2>Cuộc sống nhiều mảnh ghép.<br />Mochi kết nối chúng lại.</h2></div><p>Bớt chuyển qua lại giữa nhiều công cụ.<br />Thêm thời gian cho chính mình.</p></div>
        <div className={styles.featureGrid}>{features.map(({ icon: Icon, name, title, description, tag, tone }) => <article key={name} className={`${styles.featureCard} ${styles[tone]}`}><div className={styles.cardTop}><span className={styles.featureIcon}><Icon size={25} strokeWidth={1.7} /></span><span>{name}</span></div><h3>{title}</h3><p>{description}</p><span className={styles.featureTag}>{tag} <ArrowUpRight size={16} /></span></article>)}</div>
      </section>
      <section id="approach" className={styles.approach}><div><span className={styles.eyebrow}>TIẾN BỘ THEO NHỊP CỦA BẠN</span><h2>Một chút hôm nay.<br />Khác biệt ngày mai.</h2><p>Mochi giúp bạn nhìn thấy những nỗ lực nhỏ, để mỗi ngày đều có một lý do tiếp tục.</p></div><ol className={styles.steps}><li><span>01</span><div><h3>Chọn điều bạn muốn chăm sóc</h3><p>Một mục tiêu, một buổi học hay một thói quen tốt.</p></div></li><li><span>02</span><div><h3>Ghi lại từng bước tiến</h3><p>Đưa học tập, vận động và chi tiêu vào nhịp sống mỗi ngày.</p></div></li><li><span>03</span><div><h3>Nhìn lại và tiếp tục</h3><p>Theo dõi tiến độ, ghi nhận thành tích và điều chỉnh mục tiêu.</p></div></li></ol></section>
      <section id="ai" className={styles.ai}><div className={styles.aiIntro}><span className={styles.aiBadge}><Sparkles size={15} /> ĐANG PHÁT TRIỂN</span><h2>Một người bạn AI.<br />Đang được vun đắp.</h2><p>Chúng tôi đang phát triển Mochi AI để hành trình chăm sóc bản thân có thêm sự đồng hành. Các khả năng dưới đây là định hướng phát triển, chưa được giới thiệu là tính năng hoàn thiện.</p><span className={styles.aiSignature}><Cat size={22} /> Có thêm Mochi, có thêm động lực.</span></div><div className={styles.aiIdeas}><div><span>01 / TRÒ CHUYỆN</span><h3>Đồng hành cùng mục tiêu</h3><p>Hướng tới trò chuyện và gợi ý phù hợp với hành trình cá nhân.</p></div><div><span>02 / GÓC NHÌN MỖI NGÀY</span><h3>Hiểu những bước tiến nhỏ</h3><p>Đang phát triển bản tổng kết và gợi ý từ hoạt động hằng ngày.</p></div><div><span>03 / ĐỘNG VIÊN</span><h3>Thêm một lời khích lệ</h3><p>Khám phá cách Mochi phản hồi theo những cột mốc của bạn.</p></div></div></section>
      <section className={styles.cta}><span aria-hidden="true">✳</span><h2>Cho những điều tốt đẹp<br />một chỗ trong ngày của bạn.</h2><p>Hành trình của bạn. Nhịp điệu của bạn. Mochi đồng hành.</p><Link href="/login" className={styles.primary}>Bắt đầu cùng Mochi <ArrowRight size={19} /></Link></section>
    </main>
    <footer className={styles.footer}><Link href="/" className={styles.brand}><Cat size={22} /> Mochi Life<span className={styles.brandDot}>.</span></Link><p>Từng bước nhỏ, mỗi ngày.</p><Link href="/login">Login <ArrowUpRight size={15} /></Link></footer>
  </div>
}
