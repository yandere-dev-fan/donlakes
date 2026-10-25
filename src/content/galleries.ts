export interface Gallery { title: string; images: string[]; videos?: string[]; alt: string }
export const galleries: Record<string, Gallery> = {
  "cottages": {
    "title": "Срубы базы — общая галерея",
    "images": [
      "srub/srub2",
      "srub/srub3",
      "srub/srub4",
      "srub/srub10",
      "srub/srub1",
      "srub/srub5",
      "srub/srub6",
      "srub/srub7",
      "srub/srub8",
      "srub/srub9",
      "srub/srub11",
      "srub/srub12",
      "srub/WC_public"
    ],
    "alt": "Срубы на базе «Донские озёра»"
  },
  "sauna": {
    "title": "Бани базы — общая галерея",
    "images": [
      "banya/banya7",
      "banya_parilnaya_komnata",
      "banya/banya22",
      "banya/banya5",
      "banya/banya6",
      "banya/banya8",
      "banya/banya9",
      "banya/banya10",
      "banya/banya11",
      "banya/banya12",
      "banya/banya13",
      "banya/banya14",
      "banya/banya15",
      "banya/banya16",
      "banya/banya17",
      "banya/banya18",
      "banya/banya19",
      "banya/banya21",
      "banya/banya23",
      "banya/banya24",
      "banya/banya25",
      "banya_barrel",
      "banya/banya1",
      "banya-lake",
      "banya_night2",
      "lake/lake11",
      "banya_winter/photo_5280587949303079256_y",
      "banya_winter/photo_5280587949303079268_y",
      "banya_winter/photo_5280587949303079253_y",
      "banya_winter/photo_5280587949303079269_y",
      "banya_winter/photo_5280587949303079258_y",
      "banya_winter/photo_5280587949303079257_y",
      "banya_winter/photo_5280587949303079266_y",
      "veniki-drova-furnace/photo_5280587949303079259_y",
      "veniki-drova-furnace/photo_5280587949303079260_y",
      "veniki-drova-furnace/photo_5280587949303079261_y",
      "veniki-drova-furnace/photo_5280587949303079262_y",
      "veniki-drova-furnace/photo_5280587949303079263_y",
      "veniki-drova-furnace/photo_5280587949303079264_y"
    ],
    "alt": "Бани на базе «Донские озёра»"
  },
  "gazebos": {
    "title": "Беседки базы — общая галерея",
    "images": [
      "besedki/besedka9",
      "besedki/besedka",
      "besedki/besedka1",
      "besedki/besedka3",
      "besedki/besedka4",
      "besedki/besedka5",
      "besedki/besedka6",
      "besedki/besedka7",
      "besedki/besedka8",
      "besedki/besedka10"
    ],
    "alt": "Беседки на территории базы",
    "videos": [
      "besedki/IMG_2705.mp4"
    ]
  },
  "big-gazebo": {
    "title": "Большая беседка",
    "images": [
      "besedki/besedka3",
      "besedki/besedka"
    ],
    "alt": "Большая беседка с длинными столами"
  },
  "water": {
    "title": "Пляж и озеро",
    "images": [
      "lake/beach",
      "lake/lake",
      "lake/lake2",
      "lake/lake-swingchair"
    ],
    "alt": "Отдых у озера"
  },
  "volleyball": {
    "title": "Волейбольная площадка",
    "images": [
      "volleyball/photo_5280587949303079248_y"
    ],
    "alt": "Песчаная волейбольная площадка на другом берегу"
  },
  "kids": {
    "title": "Детям и активным",
    "images": [
      "misc/playground",
      "misc/playground2",
      "misc/batut",
      "misc/pingpong",
      "misc/terra"
    ],
    "alt": "Площадки и активности на базе"
  },
  "facilities": {
    "title": "Общие душ, туалет и кухня",
    "images": [
      "wc/photo_5285066930177908840_y",
      "wc/WC_public2",
      "wc/photo_5285066930177908837_y",
      "wc/photo_5285066930177908839_y"
    ],
    "alt": "Здание общих удобств, душевая и кухня"
  },
  "sunsets": {
    "title": "Вечера у озера",
    "images": [
      "banya_night2",
      "lake/lake11",
      "lake/lake-swingchair",
      "misc/venik-lake"
    ],
    "alt": "Вечерний отдых у озера"
  },
  "platform-2": {
    "title": "Платформа бани № 2",
    "images": [
      "banya/banya1",
      "banya-lake",
      "lake/lake-mangal",
      "banya/banya13",
      "banya/banya14"
    ],
    "alt": "Платформа бани № 2 над водой"
  },
  "summer": {
    "title": "Летние домики — общая галерея",
    "images": [
      "summer_houses/photo_5280587949303079236_y",
      "summer_houses/photo_5285066930177908835_y",
      "summer_houses/photo_5280587949303079231_y",
      "summer_houses/photo_5280587949303079232_y",
      "summer_houses/photo_5280587949303079233_y",
      "summer_houses/photo_5280587949303079234_y",
      "summer_houses/photo_5280587949303079235_y"
    ],
    "videos": [
      "summer_houses/IMG_2580.mp4",
      "summer_houses/IMG_2581.mp4",
      "summer_houses/IMG_2721.mp4"
    ],
    "alt": "Летние домики: территория и интерьеры"
  },
  "sauna-winter": {
    "title": "Бани зимой",
    "images": [
      "banya_winter/photo_5280587949303079256_y",
      "banya_winter/photo_5280587949303079268_y",
      "banya_winter/photo_5280587949303079253_y",
      "banya_winter/photo_5280587949303079269_y",
      "banya_winter/photo_5280587949303079258_y",
      "banya_winter/photo_5280587949303079257_y",
      "banya_winter/photo_5280587949303079266_y"
    ],
    "alt": "Зимний отдых у бань и купель"
  },
  "sauna-details": {
    "title": "Банные детали",
    "images": [
      "veniki-drova-furnace/photo_5280587949303079259_y",
      "veniki-drova-furnace/photo_5280587949303079260_y",
      "veniki-drova-furnace/photo_5280587949303079261_y",
      "veniki-drova-furnace/photo_5280587949303079262_y",
      "veniki-drova-furnace/photo_5280587949303079263_y",
      "veniki-drova-furnace/photo_5280587949303079264_y"
    ],
    "alt": "Печь, дрова и банные веники"
  },
  "admin": {
    "title": "Администрация",
    "images": [
      "admin/photo_5285066930177908832_y"
    ],
    "alt": "Здание администрации базы"
  }
};
