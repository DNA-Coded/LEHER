import { 
  CardCurtainReveal,
  CardCurtainRevealBody,
  CardCurtainRevealDescription,
  CardCurtainRevealTitle,
  CardCurtain,
} from "@/components/ui/card-curtain-reveal"

export const CardCurtainRevealDemo = () => {
  return (
    <div className="min-h-screen place-content-center place-items-center bg-black p-8">
      <CardCurtainReveal className="w-96 border border-zinc-800 bg-zinc-950 text-zinc-50 shadow-2xl rounded-2xl">
        <CardCurtainRevealBody className="relative z-10 flex flex-col p-6 space-y-3">
          <CardCurtainRevealTitle 
            className="text-2xl font-bold tracking-tight text-white"
          >
            Behind the Curtain
          </CardCurtainRevealTitle>
          <CardCurtainRevealDescription alwaysVisible className="text-zinc-400 text-sm leading-relaxed">
            <p>
              Lorem ipsum dolor sit amet consectetur adipisicing elit.
              Accusantium voluptate, eum quia temporibus fugiat rerum nobis modi
              dolor, delectus laboriosam, quae adipisci reprehenderit officiis
              quidem iure ducimus incidunt officia. Magni, eligendi repellendus.
              Fugiat, natus aut?
            </p>
          </CardCurtainRevealDescription>

          <CardCurtain className="bg-white/[0.03] pointer-events-none" />
        </CardCurtainRevealBody>
      </CardCurtainReveal>
    </div>
  )
}

export default CardCurtainRevealDemo
