import HeroSwiper from "@/components/ui/HeroSwiper";
import HomeFeatureSection from "@/components/ui/HomeFeatureSection";
import HomeConcertSection from "@/components/ui/HomeConcertSection";
import CuratorPickSection from "@/components/ui/CuratorPickSection";
import ClassicReadSection from "@/components/ui/ClassicReadSection";

export default function Home() {
  return (
    <>
      <HeroSwiper />
      <HomeFeatureSection />
      <HomeConcertSection />
      {/* <CuratorPickSection />
      <ClassicReadSection /> */}
    </>
  );
}
