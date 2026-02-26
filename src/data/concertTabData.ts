export interface SubItem {
  label: string;
  tag?: string;
  showOthers?: boolean;
}

export interface TabData {
  label: string;
  items: SubItem[];
  rankOnly?: boolean;
}

export const concertTabData: TabData[] = [
  {
    label: "작곡가",
    items: [
      { label: "바흐", tag: "바흐" },
      { label: "헨델", tag: "헨델" },
      { label: "비발디", tag: "비발디" },
      { label: "하이든", tag: "하이든" },
      { label: "모차르트", tag: "모차르트" },
      { label: "베토벤", tag: "베토벤" },
      { label: "슈베르트", tag: "슈베르트" },
      { label: "멘델스존", tag: "멘델스존" },
      { label: "슈만", tag: "슈만" },
      { label: "쇼팽", tag: "쇼팽" },
      { label: "리스트", tag: "리스트" },
      { label: "브람스", tag: "브람스" },
      { label: "생상스", tag: "생상스" },
      { label: "드보르자크", tag: "드보르자크" },
      { label: "차이코프스키", tag: "차이코프스키" },
      { label: "시벨리우스", tag: "시벨리우스" },
      { label: "말러", tag: "말러" },
      { label: "드뷔시", tag: "드뷔시" },
      { label: "라벨", tag: "라벨" },
      { label: "라흐마니노프", tag: "라흐마니노프" },
      { label: "스트라빈스키", tag: "스트라빈스키" },
      { label: "프로코피예프", tag: "프로코피예프" },
      { label: "쇼스타코비치", tag: "쇼스타코비치" },
      { label: "기타", showOthers: true },
    ],
  },
  {
    label: "아티스트・단체",
    items: [
      { label: "금난새", tag: "금난새" },
      { label: "김다미", tag: "김다미" },
      { label: "김봄소리", tag: "김봄소리" },
      { label: "김선욱", tag: "김선욱" },
      { label: "박혜상", tag: "박혜상" },
      { label: "백건우", tag: "백건우" },
      { label: "선우예권", tag: "선우예권" },
      { label: "손열음", tag: "손열음" },
      { label: "양성원", tag: "양성원" },
      { label: "양인모", tag: "양인모" },
      { label: "임선혜", tag: "임선혜" },
      { label: "임윤찬", tag: "임윤찬" },
      { label: "장한나", tag: "장한나" },
      { label: "정경화", tag: "정경화" },
      { label: "정명화", tag: "정명화" },
      { label: "정명훈", tag: "정명훈" },
      { label: "조성진", tag: "조성진" },
      { label: "조수미", tag: "조수미" },
      { label: "클라라 주미 강", tag: "클라라 주미 강" },
      { label: "황수미", tag: "황수미" },
      { label: "KBS교향악단", tag: "KBS교향악단" },
      { label: "경기필하모닉", tag: "경기필하모닉" },
      { label: "고잉홈프로젝트", tag: "고잉홈프로젝트" },
      { label: "대전시립교향악단", tag: "대전시립교향악단" },
      { label: "서울시립교향악단", tag: "서울시립교향악단" },
      { label: "인천시립교향악단", tag: "인천시립교향악단" },
      { label: "기타", showOthers: true },
    ],
  },
  {
    label: "작품 형태",
    items: [
      { label: "교향곡", tag: "교향곡" },
      { label: "협주곡", tag: "협주곡" },
      { label: "실내악", tag: "실내악" },
      { label: "합창", tag: "합창" },
      { label: "오페라", tag: "오페라" },
      { label: "리사이틀 · 독창회", tag: "리사이틀" },
    ],
  },
  {
    label: "악기",
    items: [
      { label: "피아노", tag: "피아노" },
      { label: "바이올린", tag: "바이올린" },
      { label: "비올라", tag: "비올라" },
      { label: "첼로", tag: "첼로" },
      { label: "플루트", tag: "플루트" },
      { label: "오보에", tag: "오보에" },
      { label: "성악", tag: "성악" },
      { label: "관악", tag: "관악" },
      { label: "타악", tag: "타악" },
    ],
  },
  {
    label: "박스오피스",
    rankOnly: true,
    items: [],
  },
];
