// ============================================================
// src/lib/creators-content.ts
// ============================================================
// Copy for the "Work with us" page for influencers / content
// creators (/creators in English, /creators/zh in Simplified
// Chinese). Terms set by the owner on 2026-11-24:
//   - 12% commission, rising to 15% for a month with 20+ bookings
//   - 10% off for followers with the creator's personal code
//   - any workshop free for the creator, at a day and time they choose,
//     in return for filming, posting and tagging us
//   - minimum 10,000 followers
//   - monthly payout by PromptPay or bank transfer (more options later)
// Commission is counted the same way the partner system already counts
// it: on what the customer actually paid, only for guests marked
// "arrived" (see src/lib/partners.ts).
// Content rules for creators mirror our own: traditional use only, no
// medical claims.
// ============================================================

export type CreatorsLang = 'en' | 'zh';

export interface CreatorsCopy {
  htmlLang: string;
  switchLabel: string;
  switchHref: string;
  heroEyebrow: string;
  heroTitle: string;
  heroSub: string;
  heroCta: string;
  stats: { value: string; label: string }[];
  offerEyebrow: string;
  offerTitle: string;
  benefits: { title: string; body: string }[];
  whoEyebrow: string;
  whoTitle: string;
  whoItems: string[];
  askEyebrow: string;
  askTitle: string;
  askItems: string[];
  stepsEyebrow: string;
  stepsTitle: string;
  steps: { title: string; body: string }[];
  payEyebrow: string;
  payTitle: string;
  payItems: string[];
  formEyebrow: string;
  formTitle: string;
  formSub: string;
  f: {
    name: string;
    email: string;
    platforms: string;
    handle: string;
    handlePh: string;
    followers: string;
    followersPh: string;
    contact: string;
    contactPh: string;
    workshop: string;
    dates: string;
    datesPh: string;
    message: string;
    messagePh: string;
    submit: string;
    sending: string;
    successTitle: string;
    successBody: string;
    errorGeneric: string;
    errorRequired: string;
  };
  platformOptions: string[];
  workshopOptions: string[];
}

const PLATFORMS = ['Instagram', 'TikTok', 'YouTube', 'Facebook'];

export const CREATORS_COPY: Record<CreatorsLang, CreatorsCopy> = {
  en: {
    htmlLang: 'en',
    switchLabel: '中文',
    switchHref: '/creators/zh',
    heroEyebrow: 'For Content Creators & Influencers',
    heroTitle: 'Create With Us\nin Chiang Mai',
    heroSub:
      'Film a hands-on Thai herbal workshop in the Old City, on us. Then earn from every booking your followers make.',
    heroCta: 'Apply to Partner →',
    stats: [
      { value: 'Free', label: 'any workshop for you' },
      { value: '12%', label: 'commission per booking' },
      { value: '15%', label: 'at 20 bookings a month' },
      { value: '10%', label: 'off for your followers' },
    ],
    offerEyebrow: 'The Offer',
    offerTitle: 'What You Get',
    benefits: [
      {
        title: 'Any workshop, free',
        body: 'Choose any workshop: Herbal Tea Blending, Ya Dom Herbal Inhaler, Herbal Massage Ball, or Natural Skincare & Aromatherapy. Pick your day and time, come and film, and take home everything you make.',
      },
      {
        title: '12% on every booking',
        body: 'Earn 12% of what each customer pays when they book with your personal code and come to the workshop.',
      },
      {
        title: 'Grow to 15%',
        body: 'Reach 20 bookings in a calendar month and your commission for that month goes up to 15%.',
      },
      {
        title: '10% off for your followers',
        body: 'Your personal code gives your audience 10% off any workshop. It gives them an easy reason to book.',
      },
      {
        title: 'Your own dashboard',
        body: 'A private page with your code, your booking link and your earnings by month. Check it any time.',
      },
    ],
    whoEyebrow: 'Who We Work With',
    whoTitle: 'Is This for You?',
    whoItems: [
      '10,000+ followers on at least one platform (Instagram, TikTok, YouTube, Facebook, Xiaohongshu, Douyin and others)',
      'Travel, wellness, lifestyle, beauty or food content',
      'A real, engaged audience. We look at comments and views, not only follower count',
    ],
    askEyebrow: 'In Return',
    askTitle: 'What We Ask',
    askItems: [
      'Film your workshop and post about it',
      'Tag @uriherbsworkshop in everything you post about us',
      'Share your personal code with your followers',
      'Mark the post as gifted or a partnership, as your platform requires',
      'Describe herbs by their traditional use. No medical or health claims, please',
    ],
    stepsEyebrow: 'The Process',
    stepsTitle: 'How It Works',
    steps: [
      { title: 'Apply', body: 'Fill in the short form below. It takes two minutes.' },
      { title: 'Get your code', body: 'We reply within a few days with your personal code, booking link and dashboard.' },
      { title: 'Pick your day', body: 'Choose your workshop, date and time. We save your seat.' },
      { title: 'Film, post and tag', body: 'Enjoy the workshop, create your content and tag us.' },
      { title: 'Get paid monthly', body: 'Every month we pay your commission for the guests who came the month before.' },
    ],
    payEyebrow: 'Payment',
    payTitle: 'How You Get Paid',
    payItems: [
      'Commission is based on what the customer actually paid, after their 10% discount',
      'It counts once your guests have come to the workshop',
      'Paid monthly by PromptPay or bank transfer. More payment options are coming soon',
    ],
    formEyebrow: 'Apply',
    formTitle: 'Become a Uri Herbs Creator',
    formSub: 'Tell us a little about you and your channel. We reply to every application.',
    f: {
      name: 'Your name',
      email: 'Email',
      platforms: 'Your platforms',
      handle: 'Main account (handle or link)',
      handlePh: '@yourname or profile link',
      followers: 'Followers on your main account',
      followersPh: 'e.g. 25,000',
      contact: 'WhatsApp / LINE / WeChat',
      contactPh: 'So we can reach you quickly',
      workshop: 'Workshop you would like to film',
      dates: 'When would you like to come?',
      datesPh: 'e.g. early December, weekday mornings',
      message: 'Anything else?',
      messagePh: 'Your content style, audience, ideas…',
      submit: 'Send Application',
      sending: 'Sending…',
      successTitle: 'Thank you!',
      successBody: 'We received your application and will get back to you within a few days.',
      errorGeneric: "Couldn't send your application. Please try again or message us on Instagram.",
      errorRequired: 'Please fill in your name, email, main account and followers.',
    },
    platformOptions: [...PLATFORMS, 'Xiaohongshu', 'Douyin', 'Other'],
    workshopOptions: [
      'Herbal Tea Blending',
      'Ya Dom Herbal Inhaler',
      'Herbal Massage Ball',
      'Natural Skincare & Aromatherapy',
      'Not sure yet',
    ],
  },

  zh: {
    htmlLang: 'zh-CN',
    switchLabel: 'English',
    switchHref: '/creators',
    heroEyebrow: '内容创作者与达人合作',
    heroTitle: '来清迈\n和我们一起创作',
    heroSub: '在清迈古城免费体验并拍摄一堂泰式草本手作课。之后，粉丝每通过您预订一次，您都能获得佣金。',
    heroCta: '申请合作 →',
    stats: [
      { value: '免费', label: '任选一门课程' },
      { value: '12%', label: '每笔预订佣金' },
      { value: '15%', label: '单月满 20 笔预订' },
      { value: '9折', label: '粉丝专属优惠' },
    ],
    offerEyebrow: '合作内容',
    offerTitle: '您将获得',
    benefits: [
      {
        title: '任选课程，免费体验',
        body: '草本茶调配、泰式 Ya Dom 草本嗅瓶、草药按摩球、天然护肤与芳疗，任您挑选。自选日期和时间，来店拍摄，亲手制作的作品全部带走。',
      },
      {
        title: '每笔预订 12% 佣金',
        body: '顾客使用您的专属优惠码预订并到店上课，您即可获得顾客实付金额的 12%。',
      },
      {
        title: '佣金最高 15%',
        body: '单个自然月内达到 20 笔预订，当月佣金提升至 15%。',
      },
      {
        title: '粉丝享 9 折',
        body: '您的专属优惠码让粉丝预订任意课程享受 9 折优惠，让他们更有理由下单。',
      },
      {
        title: '专属数据后台',
        body: '私人页面显示您的优惠码、预订链接和每月收益，随时查看。',
      },
    ],
    whoEyebrow: '合作对象',
    whoTitle: '适合您吗？',
    whoItems: [
      '至少一个平台拥有 1 万以上粉丝（小红书、抖音、Instagram、TikTok、YouTube、Facebook 等）',
      '旅行、健康、生活方式、美妆或美食类内容',
      '真实活跃的粉丝。我们会看评论和播放量，不只看粉丝数',
    ],
    askEyebrow: '您需要做的',
    askTitle: '合作要求',
    askItems: [
      '拍摄课程体验并发布内容',
      '在所有相关内容中标记 @uriherbsworkshop',
      '向粉丝分享您的专属优惠码',
      '按平台规定标注“合作”或“赠送体验”',
      '介绍草本时请以传统用法描述，不作任何医疗或功效宣称',
    ],
    stepsEyebrow: '合作流程',
    stepsTitle: '如何参与',
    steps: [
      { title: '提交申请', body: '填写下方简短表格，只需两分钟。' },
      { title: '获取优惠码', body: '我们会在几天内回复，发送您的专属优惠码、预订链接和数据后台。' },
      { title: '选择时间', body: '选择课程、日期和时间，我们为您预留名额。' },
      { title: '拍摄、发布、标记', body: '享受课程，创作内容，并标记我们。' },
      { title: '按月结算', body: '每月支付上个月已到店顾客的佣金。' },
    ],
    payEyebrow: '结算方式',
    payTitle: '佣金如何支付',
    payItems: [
      '佣金按顾客实付金额（扣除 9 折优惠后）计算',
      '顾客到店上课后计入佣金',
      '每月通过 PromptPay 或银行转账支付，更多付款方式即将推出',
    ],
    formEyebrow: '申请',
    formTitle: '成为 Uri Herbs 合作创作者',
    formSub: '简单介绍一下您和您的账号。每一份申请我们都会回复。',
    f: {
      name: '您的姓名',
      email: '邮箱',
      platforms: '您的平台',
      handle: '主账号（账号名或链接）',
      handlePh: '@账号名 或主页链接',
      followers: '主账号粉丝数',
      followersPh: '例如 25,000',
      contact: '微信 / WhatsApp / LINE',
      contactPh: '方便我们快速联系您',
      workshop: '想拍摄的课程',
      dates: '您希望什么时候来？',
      datesPh: '例如 12 月初，工作日上午',
      message: '其他想告诉我们的？',
      messagePh: '内容风格、粉丝群体、创意想法……',
      submit: '提交申请',
      sending: '提交中……',
      successTitle: '谢谢！',
      successBody: '我们已收到您的申请，会在几天内回复您。',
      errorGeneric: '提交失败，请重试，或通过 Instagram 私信我们。',
      errorRequired: '请填写姓名、邮箱、主账号和粉丝数。',
    },
    platformOptions: ['小红书', '抖音', ...PLATFORMS, '其他'],
    workshopOptions: ['草本茶调配', '泰式 Ya Dom 草本嗅瓶', '草药按摩球', '天然护肤与芳疗', '还没决定'],
  },
};
