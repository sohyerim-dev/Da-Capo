import HeroSwiper from "@/components/ui/HeroSwiper";
import HomeFeatureSection from "@/components/ui/HomeFeatureSection";
import HomeConcertSection from "@/components/ui/HomeConcertSection";
import CuratorPickSection from "@/components/ui/CuratorPickSection";
import ClassicReadSection from "@/components/ui/ClassicReadSection";
import SplashScreen from "@/components/ui/SplashScreen";

export default function Home() {
  return (
    <>
      <SplashScreen />
      <HeroSwiper />
      <HomeFeatureSection />
      <HomeConcertSection />
      {/* <CuratorPickSection />
      <ClassicReadSection /> */}
    </>
  );
}
