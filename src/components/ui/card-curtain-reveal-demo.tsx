import { 
  CardCurtainReveal,
  CardCurtainRevealBody,
  CardCurtainRevealDescription,
  CardCurtainRevealFooter,
  CardCurtainRevealTitle,
  CardCurtain,
} from "@/components/ui/card-curtain-reveal"

import { ArrowUpRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export const CardCurtainRevealDemo = () => {
  return (
    <div className="min-h-screen place-content-center place-items-center bg-black p-8">
      <CardCurtainReveal className="h-[560px] w-96 border border-zinc-800 bg-zinc-950 text-zinc-50 shadow-2xl rounded-2xl">
        <CardCurtainRevealBody className="relative z-10 flex flex-col h-full p-6">
          <CardCurtainRevealTitle 
            initialY={120}
            className="text-3xl font-medium tracking-tight"
          >
            Behind <br />
            the Curtain
          </CardCurtainRevealTitle>
          <CardCurtainRevealDescription className="my-4 text-zinc-400 text-sm">
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Accusantium voluptate, eum quia temporibus fugiat rerum nobis modi
              dolor, delectus laboriosam, quae adipisci reprehenderit officiis
              quidem iure ducimus incidunt officia. Magni, eligendi repellendus.
              Fugiat, natus aut?
            </p>
          </CardCurtainRevealDescription>
          <div className="mt-auto pt-4">
            <Button
              variant={"secondary"}
              size={"icon"}
              className="aspect-square rounded-full bg-white/10 hover:bg-white text-white hover:text-black transition-colors"
            >
              <ArrowUpRight className="w-5 h-5" />
            </Button>
          </div>

          <CardCurtain className="bg-cyan-500/10 pointer-events-none" />
        </CardCurtainRevealBody>

        <CardCurtainRevealFooter className="mt-auto h-48 overflow-hidden">
          <img
            width="100%"
            height="100%"
            alt="Tokyo street"
            className="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80"
          />
        </CardCurtainRevealFooter>
      </CardCurtainReveal>
    </div>
  )
}

export default CardCurtainRevealDemo
