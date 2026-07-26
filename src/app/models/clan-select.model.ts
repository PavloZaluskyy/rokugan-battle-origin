import { ClanType } from './game.model';

export interface ClanDetails {
  id: ClanType;
  name: string;
  kanji: string;
  motto: string;
  monBannerImg: string;
  videoUrlUrlIntro: string; // Шлях до відео появи
  videoUrlIdle: string;   // Шлях до відео зацикленого стояння
  specialAbilityTitle: string;
  specialAbilityDesc: string;
  lore: string;
  primaryColor: string;
}

export const CLAN_DETAILS_DATA: ClanDetails[] = [
  {
    id: 'Crab',
    name: 'Клан Краба',
    kanji: '蟹',
    motto: 'Стіна, що не впаде',
    monBannerImg: '/assets/images/Clans/crab.jpg',
    videoUrlUrlIntro: 'assets/video/intro_clan_crab.mp4',
    videoUrlIdle: 'assets/video/idea_clan_crab.mp4',
    specialAbilityTitle: 'Непохитна Захист',
    specialAbilityDesc: 'Жетони армії Краба отримують +1 до сили при захисті власної провінції.',
    lore: 'Захисники Великої Стіни Кайю. Вони щодня стримують орди Тіньових Земель, жертвуючи лоском заради сталі та виживаності.',
    primaryColor: '#4a4a4a'
  },
  {
    id: 'Crane',
    name: 'Клан Журавля',
    kanji: '鶴',
    motto: 'Душа Ізумрудної Імперії',
    monBannerImg: '/assets/images/Clans/crane.jpg',
    videoUrlUrlIntro: 'assets/video/intro_clan_crane.mp4',
    videoUrlIdle: 'assets/video/idea_clan_crane.mp4',
    specialAbilityTitle: 'Витончена Дипломатія',
    specialAbilityDesc: 'Жетони дипломатії Журавля не можуть бути скасовані або замінені ефектами інших гравців.',
    lore: 'Майстри дуелей дуелянтів та мистецтва. Вони керують двором Імператора з елегантністю, що смертоносніша за лезо катани.',
    primaryColor: '#0080ff'
  },
  {
    id: 'Dragon',
    name: 'Клан Дракона',
    kanji: '龍',
    motto: 'Шлях Монаха та Меча',
    monBannerImg: '/assets/images/Clans/dragon.jpg',
    videoUrlUrlIntro: 'assets/video/intro_clan_dragon.mp4',
    videoUrlIdle: 'assets/video/idea_clan_dragon.mp4',
    specialAbilityTitle: 'Просвітлення Татуювань',
    specialAbilityDesc: 'Може розіграти 1 додаткову карту розвідки за раунд без витрати ходу.',
    lore: 'Мудреці та самітники з високогірних монастирів. Їхні воїни володіють двома мечами та таємничими татуюваннями ками.',
    primaryColor: '#00994d'
  },
  {
    id: 'Lion',
    name: 'Клан Лева',
    kanji: '獅',
    motto: 'Права Рука Імператора',
    monBannerImg: '/assets/images/Clans/lion.jpg',
    videoUrlUrlIntro: 'assets/video/intro_clan_lion.mp4',
    videoUrlIdle: 'assets/video/idle_clan_lion.mp4',
    specialAbilityTitle: 'Воєнна Слава',
    specialAbilityDesc: 'Отримує +1 додаткове очко честі за кожну успішну атаку на столицю противника.',
    lore: 'Непереможна армія Рокугану. Честь для них вища за життя, а їхні самураї не знають страху перед лицем смерті.',
    primaryColor: '#d4af37'
  },
  {
    id: 'Phoenix',
    name: 'Клан Фенікса',
    kanji: '鳳',
    motto: 'Голос Стихій',
    monBannerImg: 'assets/images/Clans/phoenix.jpg',
    videoUrlUrlIntro: 'assets/video/intro_clan_phoenix.mp4',
    videoUrlIdle: 'assets/video/idle_clan_phoenix.mp4',
    specialAbilityTitle: 'Магія Сюгэндзя',
    specialAbilityDesc: 'Отримує 1 додаткову карту Сюгэндзя на початку гри.',
    lore: 'Хранителі древньої магії та стихійних ками. Вони прагнуть миру, але їхнє заклинання палає яскравіше за будь-яку армію.',
    primaryColor: '#c43c21'
  },
  {
    id: 'Scorpion',
    name: 'Клан Скорпіона',
    kanji: '蠍',
    motto: 'Тінь, що зберігає Світло',
    monBannerImg: 'assets/images/Clans/scorpion.jpg',
    videoUrlUrlIntro: 'assets/video/intro_clan_scorpion.mp4',
    videoUrlIdle: 'assets/video/idle_clan_scorpion.mp4',
    specialAbilityTitle: 'Блеф та Підступність',
    specialAbilityDesc: 'Пустий жетон Скорпіона (Блеф) можна перемістити в іншу провінцію в фазі розміщення.',
    lore: 'Лиходії, яких потребує Імперія. Вони діють із тіні, використовують отруту та хитрощі, щоб захистити трон ціною власної честі.',
    primaryColor: '#781c1c'
  },
  {
    id: 'Unicorn',
    name: 'Клан Єдинорога',
    kanji: '麒',
    motto: 'Вершники Західних Степів',
    monBannerImg: 'assets/images/Clans/unicorn.jpg',
    videoUrlUrlIntro: 'assets/video/intro_clan_unicorn.mp4',
    videoUrlIdle: 'assets/video/idle_clan_unicorn.mp4',
    specialAbilityTitle: 'Степова Кіннота',
    specialAbilityDesc: 'Може атакувати наземні провінції, які знаходяться через одну провінцію від підконтрольної.',
    lore: 'Мандрівники, що повернулися з далеких земель. Їхня дика кіннота та чужоземні луки зносять будь-які шикування ворога.',
    primaryColor: '#8a4199'
  }
];