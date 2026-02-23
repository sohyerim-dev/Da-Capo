export interface SubItem {
  label: string;
  keywords: string[];
  excludeKeywords?: string[];
  requireAny?: string[];
  showOthers?: boolean;
}

export interface TabData {
  label: string;
  searchFields: string[];
  items: SubItem[];
  rankOnly?: boolean;
}

export const concertTabData: TabData[] = [
  {
    label: "작곡가",
    searchFields: ["title", "synopsis"],
    items: [
      { label: "바흐", keywords: ["바흐", "Bach"] },
      { label: "헨델", keywords: ["헨델", "Handel"] },
      { label: "비발디", keywords: ["비발디", "Vivaldi"] },
      { label: "하이든", keywords: ["하이든", "Haydn"] },
      { label: "모차르트", keywords: ["모차르트", "Mozart"] },
      { label: "베토벤", keywords: ["베토벤", "Beethoven"] },
      { label: "슈베르트", keywords: ["슈베르트", "Schubert"] },
      { label: "멘델스존", keywords: ["멘델스존", "Mendelssohn"] },
      { label: "슈만", keywords: ["슈만", "Schumann"] },
      { label: "쇼팽", keywords: ["쇼팽", "Chopin"] },
      { label: "리스트", keywords: ["리스트", "Liszt"] },
      { label: "브람스", keywords: ["브람스", "Brahms"] },
      { label: "생상스", keywords: ["생상스", "Saint-Saëns", "Saint-Saens"] },
      { label: "드보르자크", keywords: ["드보르자크", "Dvorak"] },
      { label: "차이코프스키", keywords: ["차이코프스키", "Tchaikovsky"] },
      { label: "시벨리우스", keywords: ["시벨리우스", "Sibelius"] },
      { label: "말러", keywords: ["말러", "Mahler"] },
      { label: "드뷔시", keywords: ["드뷔시", "Debussy"] },
      { label: "라벨", keywords: ["라벨", "Ravel"] },
      {
        label: "라흐마니노프",
        keywords: ["라흐마니노프", "Rachmaninoff", "Rachmaninov"],
      },
      { label: "스트라빈스키", keywords: ["스트라빈스키", "Stravinsky"] },
      { label: "프로코피예프", keywords: ["프로코피예프", "Prokofiev"] },
      { label: "쇼스타코비치", keywords: ["쇼스타코비치", "Shostakovich"] },
      { label: "기타", keywords: [], showOthers: true },
    ],
  },
  {
    label: "아티스트・단체",
    searchFields: ["title", "synopsis", "performers", "producer"],
    items: [
      { label: "금난새", keywords: ["금난새"] },
      { label: "김다미", keywords: ["김다미"] },
      { label: "김봄소리", keywords: ["김봄소리"] },
      { label: "김선욱", keywords: ["김선욱"] },
      { label: "박혜상", keywords: ["박혜상"] },
      { label: "백건우", keywords: ["백건우"] },
      { label: "선우예권", keywords: ["선우예권"] },
      { label: "손열음", keywords: ["손열음"] },
      { label: "양성원", keywords: ["양성원"] },
      { label: "양인모", keywords: ["양인모"] },
      { label: "임선혜", keywords: ["임선혜"] },
      { label: "임윤찬", keywords: ["임윤찬"] },
      { label: "정경화", keywords: ["정경화"] },
      { label: "정명화", keywords: ["정명화"] },
      { label: "정명훈", keywords: ["정명훈"] },
      { label: "조성진", keywords: ["조성진"] },
      { label: "조수미", keywords: ["조수미"] },
      { label: "클라라 주미 강", keywords: ["클라라 주미 강"] },
      { label: "황수미", keywords: ["황수미"] },
      { label: "KBS교향악단", keywords: ["KBS교향악단"] },
      { label: "경기필하모닉", keywords: ["경기필하모닉", "경기필"] },
      { label: "고잉홈프로젝트", keywords: ["고잉홈프로젝트"] },
      { label: "대전시립교향악단", keywords: ["대전시립교향악단"] },
      { label: "서울시립교향악단", keywords: ["서울시립교향악단", "서울시향"] },
      { label: "인천시립교향악단", keywords: ["인천시립교향악단"] },
      { label: "기타", keywords: [], showOthers: true },
    ],
  },
  {
    label: "작품 형태",
    searchFields: ["title", "synopsis"],
    items: [
      { label: "교향곡", keywords: ["교향곡", "Symphony", "Symphonic"] },
      { label: "협주곡", keywords: ["협주곡", "Concerto"] },
      { label: "실내악", keywords: ["실내악", "Chamber"] },
      {
        label: "합창",
        keywords: [
          "합창",
          "오라토리오",
          "Oratorio",
          "칸타타",
          "Cantata",
          "미사",
          "Mass",
          "레퀴엠",
          "Requiem",
          "모테트",
          "Motet",
        ],
        excludeKeywords: ["독창회", "독주회", "리사이틀", "Recital"],
      },
      {
        label: "오페라",
        keywords: ["오페라", "Opera"],
        requireAny: ["오페라단", "오페라 갈라"],
      },
      {
        label: "리사이틀 · 독창회",
        keywords: [
          "리사이틀",
          "독창회",
          "독주회",
          "Recital",
          "소프라노",
          "메조소프라노",
          "테너",
          "베이스",
          "바리톤",
        ],
      },
    ],
  },
  {
    label: "악기",
    searchFields: ["title"],
    items: [
      { label: "피아노", keywords: ["피아노"] },
      { label: "바이올린", keywords: ["바이올린"] },
      { label: "비올라", keywords: ["비올라"] },
      { label: "첼로", keywords: ["첼로"] },
      { label: "플루트", keywords: ["플루트"] },
      { label: "오보에", keywords: ["오보에"] },
      {
        label: "성악",
        keywords: [
          "성악",
          "소프라노",
          "메조소프라노",
          "테너",
          "베이스",
          "바리톤",
        ],
        excludeKeywords: ["더블베이스"],
      },
      {
        label: "관악",
        keywords: [
          "관악",
          "플루트",
          "오보에",
          "클라리넷",
          "바순",
          "호른",
          "트럼펫",
          "트롬본",
          "튜바",
        ],
      },
      {
        label: "타악",
        keywords: ["타악", "타악기", "마림바", "팀파니", "퍼커션"],
      },
    ],
  },
  {
    label: "박스오피스",
    rankOnly: true,
    searchFields: [],
    items: [],
  },
];
