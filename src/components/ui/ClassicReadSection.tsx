import "./ClassicReadSection.scss";

const classicRead = {
  title: "바흐의 음악은 왜 여전히 우리를 사로잡는가",
  author: "어거스트",
  moreUrl: "/magazine/2",
  summary:
    "요한 제바스티안 바흐의 음악은 300년이 지난 지금도 여전히 연주되고 사랑받고 있으며, 단순한 선율을 넘어 치밀한 구조와 깊은 정신성을 동시에 담아 여러 성부가 독립적으로 움직이면서도 하나의 질서를 이루는 균형과 안정감을 만들어내고, 특정한 감정을 직접 드러내기보다 서서히 마음에 스며드는 깊이를 지니며 현대 악기뿐 아니라 바로크 악기로도 다양한 분위기로 연주되어 그의 음악 세계의 폭을 보여주고, 바쁜 일상 속에서 잠시 멈춰 깊이 있는 음악을 듣고 싶을 때 복잡한 생각을 정리하고 마음을 차분히 가라앉히는 데 훌륭한 출발점이 된다.",
  image: "https://picsum.photos/seed/classic-read/860/480",
  imageAlt: "클래식 읽기 대표 이미지",
};

export default function ClassicReadSection() {
  return (
    <section className="classic-read">
      <div className="wrap">
        <h2 className="classic-read__section-title">| 클래식 읽기</h2>

        <article className="classic-read__article">
          <header className="classic-read__header">
            <div className="classic-read__header-left">
              <h3 className="classic-read__title">{classicRead.title}</h3>
              <span className="classic-read__author">
                by. {classicRead.author}
              </span>
            </div>
            <a href={classicRead.moreUrl} className="classic-read__more">
              … 더보기
            </a>
          </header>

          <p className="classic-read__summary">{classicRead.summary}</p>

          <img
            src={classicRead.image}
            alt={classicRead.imageAlt}
            className="classic-read__image"
          />
        </article>
      </div>
    </section>
  );
}
