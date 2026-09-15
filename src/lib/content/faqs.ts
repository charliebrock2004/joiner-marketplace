export type Faq = { question: string; answer: string };

/**
 * Single source of truth for the FAQ — rendered on the page and emitted as
 * FAQPage structured data, so the two can never drift apart.
 */
export const faqs: Faq[] = [
  {
    question: "What kind of jobs can I post?",
    answer:
      "Anything joinery or carpentry related: hanging a door, fitting skirting and architrave, laying flooring, putting up shelving, building flat-pack furniture, fitting a loft hatch, or small timber repairs. If you are not sure whether it fits, post it anyway and we will tell you.",
  },
  {
    question: "Can I post a really small job?",
    answer:
      "Yes — small jobs are the whole point. Most joinery firms are booked out on kitchens and extensions, so a two-hour job is hard to get someone out for. We are building a network of joiners who actively want that work to fill evenings, weekends and quiet days.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Posting a job is free, and it is free for joiners to register during our early launch. You agree the price for the work directly with the joiner. We do not take a cut of the job and we do not handle your payment.",
  },
  {
    question: "Can apprentices join?",
    answer:
      "Yes. Apprentices and trainees are welcome to register, and plenty of small jobs are a good fit for someone building experience. What matters is that customers can see exactly who they are dealing with, so experience level is shown clearly rather than hidden — an apprentice is never presented as a fully qualified joiner.",
  },
  {
    question: "Do joiners need to be qualified?",
    answer:
      "Not for every job, but you will always be able to see what someone has told us about their experience and qualifications. We are building verification into the platform so those claims can be checked properly. Until that is live we show experience as self-declared, and we say so.",
  },
  {
    question: "Where is the service available?",
    answer:
      "We are starting in Perthshire — Perth, Crieff, Auchterarder, Dunblane, Kinross, Pitlochry and the surrounding areas. We are building the joiner network area by area rather than pretending to cover the whole country. If you are outside that, register anyway and we will let you know when we reach you.",
  },
  {
    question: "How are joiners reviewed?",
    answer:
      "Reviews and reputation are being built now and are not live yet. The plan is straightforward: only a customer whose job was actually completed through the platform can leave a review, and alongside the star rating you will see jobs completed, completion rate, response rate and verification status.",
  },
  {
    question: "Is the full platform available yet?",
    answer:
      "Not yet. Right now you can post a job or register as a joiner, and we match people up by hand behind the scenes. That is deliberate: we would rather get real jobs done for real people first and build the automated marketplace on top of what we learn.",
  },
  {
    question: "What happens after I submit a job?",
    answer:
      "It comes straight to us. We read it, and if it is in our launch area we contact suitable local joiners and put you in touch with whoever has availability. If we cannot cover your area yet we will tell you honestly rather than leave you waiting.",
  },
];
