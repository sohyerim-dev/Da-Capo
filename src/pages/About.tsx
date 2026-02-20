import "./About.scss";

export default function About() {
  return (
    <div className="about">
      <div className="wrap">
        <h1 className="about__title">Da Capo 다 카포 소개</h1>
        <hr />
        <br />
        <div className="about__content">
          <p>
            Da Capo는 이탈리아어로 ‘처음부터 다시’라는 뜻을 지닌 표현으로,
            클래식 음악이라는 근본으로 돌아가자는 의미를 은유적으로 담고
            있습니다. 또한 클래식으로 향하는 가장 자연스러운 시작이 되고자 하는
            의지를 담았습니다.
          </p>
          <br />
          <p>
            Da Capo는 단순한 공연 정보 제공을 넘어, 실제 클래식 향유자의 이용
            흐름을 반영하여 설계된 서비스입니다. 날짜나 지역 중심의 일반적인
            분류 방식이 아니라, 작곡가·연주자·작품 등 클래식 팬들의 탐색 방식에
            맞춘 카테고리를 제공하여 원하는 공연을 보다 쉽게 찾을 수 있도록
            했습니다. 또한 공연을 탐색하는 데서 그치지 않고, 관람 경험을
            기록하고 공유할 수 있도록 구성하여 클래식 감상의 흐름이 자연스럽게
            이어지도록 했습니다.
          </p>
          <br />
          <p>
            Da Capo를 통해 누구나 클래식을 더 쉽고 깊이 있게 향유할 수 있기를
            바랍니다.
          </p>
          <br />
          <img
            src="/images/about-image.png"
            alt="Da Capo 소개 이미지"
            className="about__image"
          />
        </div>
      </div>
    </div>
  );
}
