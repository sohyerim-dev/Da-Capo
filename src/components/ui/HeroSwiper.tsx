import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade, Pagination } from "swiper/modules";
import type { ReactNode } from "react";
import "swiper/css";
import "swiper/css/effect-fade";
import "swiper/css/pagination";
import "./HeroSwiper.scss";

interface SlideItem {
  image: string;
  text?: ReactNode;
  logo?: string;
}

const slides: SlideItem[] = [
  {
    image: "/images/main-image-1.svg",
    text: (
      <>
        클래식을 <br className="hero__text-br" />
        발견하는 가장 좋은 방법,
      </>
    ),
  },
  { image: "/images/main-image-2.svg", text: "클래식 공연 중심 플랫폼" },
  { image: "/images/main-image-3.svg", logo: "/images/main-logo.svg" },
];

export default function HeroSwiper() {
  return (
    <section className="hero">
      <Swiper
        modules={[Autoplay, EffectFade, Pagination]}
        effect="fade"
        autoplay={{
          delay: 3000,
          disableOnInteraction: false,
          pauseOnMouseEnter: false,
        }}
        pagination={{ clickable: true }}
        loop
        className="hero__swiper"
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i} className="hero__slide">
            <img src={slide.image} alt="" className="hero__image" />
            {slide.text && <div className="hero__text">{slide.text}</div>}
            {slide.logo && (
              <div className="hero__logo-wrap">
                <img src={slide.logo} alt="Da Capo" className="hero__logo" />
              </div>
            )}
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
