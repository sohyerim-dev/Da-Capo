import "./CuratorPickSection.scss";

const curatorPick = {
  title: "바흐를 온전히 만나는 시간",

  author: "줄라이",

  moreUrl: "/magazine/1",

  summary:
    "바흐의 대표 작품을 한 자리에서 만날 수 있는 공연. 바로크 악기의 섬세한 음색과 정교한 구조를 통해 그의 음악 세계를 깊이 있게 경험할 수 있다. 단순한 감상에 머무르지 않고, 작품이 지닌 질서와 균형을 온전히 느낄 수 있는 프로그램으로 구성되어 있다. 고요하면서도 깊은 울림을 지닌 바흐의 음악을 집중해서 듣고 싶은 관객에게 특히 추천한다.",

  concerts: [
    {
      id: 1,
      title: "공연명",
      url: "/concert/1",
      poster: "https://picsum.photos/seed/bach1/220/293",
      alt: "공연명 포스터",
    },
    {
      id: 2,
      title: "공연명",
      url: "/concert/2",
      poster: "https://picsum.photos/seed/bach2/220/293",
      alt: "공연명 포스터",
    },
    {
      id: 3,
      title: "공연명",
      url: "/concert/3",
      poster: "https://picsum.photos/seed/bach3/220/293",
      alt: "공연명 포스터",
    },
  ],
};

export default function CuratorPickSection() {
  return (
    <section className="curator-pick">
      <div className="wrap">
        <h2 className="curator-pick__section-title">| 큐레이터 픽</h2>

        <article className="curator-pick__article">
          <header className="curator-pick__header">
            <h3 className="curator-pick__title">{curatorPick.title}</h3>
            <div className="curator-pick__meta">
              <span className="curator-pick__author">by. {curatorPick.author}</span>
              <a href={curatorPick.moreUrl} className="curator-pick__more">
                … 더보기
              </a>
            </div>
          </header>

          <p className="curator-pick__summary">{curatorPick.summary}</p>

          <ul className="curator-pick__concerts">
            {curatorPick.concerts.map((c) => (
              <li key={c.id} className="curator-pick__concert">
                <a href={c.url} className="curator-pick__concert-link">
                  <figure className="curator-pick__figure">
                    <img
                      src={c.poster}
                      alt={c.alt}
                      className="curator-pick__poster"
                    />
                    <figcaption className="curator-pick__caption">
                      {c.title}
                    </figcaption>
                  </figure>
                </a>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
