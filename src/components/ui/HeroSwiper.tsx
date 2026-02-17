import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, EffectFade } from "swiper/modules";
import "swiper/css";
import "swiper/css/effect-fade";
import "./HeroSwiper.scss";

const slides = [
  { image: "/images/main-image-1.svg" },
  { image: "/images/main-image-2.svg" },
  { image: "/images/main-image-3.svg" },
];

export default function HeroSwiper() {
  return (
    <section className="hero">
      <Swiper
        modules={[Autoplay, EffectFade]}
        effect="fade"
        autoplay={{ delay: 4000, disableOnInteraction: false }}
        loop
        className="hero__swiper"
      >
        {slides.map((slide, i) => (
          <SwiperSlide key={i} className="hero__slide">
            <img src={slide.image} alt="" className="hero__image" />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
