import { Helmet } from "react-helmet-async";
import HeroSwiper from "@/components/ui/HeroSwiper";
import HomeFeatureSection from "@/components/ui/HomeFeatureSection";
import HomeConcertSection from "@/components/ui/HomeConcertSection";
import HomeMagazineSection from "@/components/ui/HomeMagazineSection";
export default function Home() {
  return (
    <>
      <Helmet>
        <title>Da Capo | 클래식 공연 중심 플랫폼</title>
        <meta name="description" content="클래식 공연을 탐색하고 관람 기록을 남기며 경험을 공유할 수 있는 클래식 공연 중심 플랫폼입니다." />
        <link rel="canonical" href="https://da-capo.co.kr" />
      </Helmet>
      <HeroSwiper />
      <HomeFeatureSection />
      <HomeConcertSection />
      <HomeMagazineSection />
    </>
  );
}
