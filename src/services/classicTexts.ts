/**
 * Rich authentic public domain book texts for Libora offline classic reader.
 * Used for zero-fail instant reading and offline fallback when external mirrors are blocked by ISP/firewalls.
 */

export interface ClassicBookDefinition {
  title: string;
  author: string;
  year?: number;
  subjects?: string[];
  content: string;
}

export const CLASSIC_PUBLIC_DOMAIN_TEXTS: Record<string, ClassicBookDefinition> = {
  // 1. Pride and Prejudice — Jane Austen
  pg_1342: {
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    year: 1813,
    subjects: ['Romance', 'Classic Literature', 'Regency'],
    content: `PRIDE AND PREJUDICE

By Jane Austen (1813)

CHAPTER 1

It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.

"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"

Mr. Bennet replied that he had not.

"But it is," returned she; "for Mrs. Long has just been here, and she told me all about it."

Mr. Bennet made no answer.

"Do you not want to know who has taken it?" cried his wife impatiently.

"You want to tell me, and I have no objection to hearing it."

This was invitation enough.

"Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it, that he agreed with Mr. Morris immediately; that he is to take possession before Michaelmas, and some of his servants are to be in the house by the end of next week."

"What is his name?"

"Bingley."

"Is he married or single?"

"Oh! Single, my dear, to be sure! A single man of large fortune; four or five thousand a year. What a fine thing for our girls!"

"How so? How can it affect them?"

"My dear Mr. Bennet," replied his wife, "how can you be so tiresome! You must know that I am thinking of his marrying one of them."

"Is that his design in settling here?"

"Design! Nonsense, how can you talk so! But it is very likely that he may fall in love with one of them, and therefore you must visit him as soon as he comes."

"I see no occasion for that. You and the girls may go, or you may send them by themselves, which perhaps will be still better, for as you are as handsome as any of them, Mr. Bingley may like you the best of the party."

"My dear, you flatter me. I certainly have had my share of beauty, but I do not pretend to be anything extraordinary now. When a woman has five grown-up daughters, she ought to give over thinking of her own beauty."

"In such cases, a woman has not often much beauty to think of."

"But, my dear, you must indeed go and see Mr. Bingley when he comes into the neighbourhood."

"It is more than I engage for, I assure you."

"But consider your daughters. Only think what an establishment it would be for one of them. Sir William and Lady Lucas are determined to go, merely on that account, for in general, you know, they visit no newcomers. Indeed you must go, for it will be impossible for us to visit him if you do not."

"You are over-scrupulous, surely. I dare say Mr. Bingley will be very glad to see you; and I will send a few lines by you to assure him of my hearty consent to his marrying whichever he chooses of the girls; though I must throw in a good word for my little Lizzy."

"I desire you will do no such thing. Lizzy is not a bit better than the others; and I am sure she is not half so handsome as Jane, nor half so good-humoured as Lydia. But you are always giving her the preference."

"They have none of them much to recommend them," replied he; "they are all silly and ignorant like other girls; but Lizzy has something more of quickness than her sisters."

"Mr. Bennet, how can you abuse your own children in such a way? You take delight in vexing me. You have no compassion for my poor nerves."

"You mistake me, my dear. I have a high respect for your nerves. They are my old friends. I have heard you mention them with consideration these last twenty years at least."

CHAPTER 2

Mr. Bennet was among the earliest of those who waited on Mr. Bingley. He had always intended to visit him, though to the last always assuring his wife that he should not go; and till the evening after the visit was paid she had no knowledge of it. It was then disclosed in the following manner. Observing his second daughter employed in trimming a hat, he suddenly addressed her with:

"I hope Mr. Bingley will like it, Lizzy."

"We are not in a way to know what Mr. Bingley likes," said her mother resentfully, "since we are not to visit."

"But you forget, mamma," said Elizabeth, "that we shall meet him at the assemblies, and that Mrs. Long promised to introduce him."

"I do not believe Mrs. Long will do any such thing. She has two nieces of her own. She is a selfish, hypocritical woman, and I have no opinion of her."

"No more have I," said Mr. Bennet; "and I am glad to find that you do not depend on her serving you."

Mrs. Bennet deigned not to make any reply, but, unable to contain herself, began scolding one of her daughters.

"Don't keep coughing so, Kitty, for heaven's sake! Have a little compassion on my nerves. You tear them to pieces."

"Kitty has no discretion in her coughs," said her father; "she times them ill."

"I do not cough for my own amusement," replied Kitty fretfully. "When is your next ball to be, Lizzy?"

"To-morrow fortnight."

"Aye, so it is," cried her mother, "and Mrs. Long does not come back till the day before; so it will be impossible for her to introduce him, for she will not know him herself."

"Then, my dear, you may have the advantage of your friend, and introduce Mr. Bingley to her."

"Impossible, Mr. Bennet, impossible, when I am not acquainted with him myself; how can you be so teasing?"

"I honour your circumspection. A fortnight's acquaintance is certainly very little. One cannot know what a man really is by the end of a fortnight. But if we do not venture somebody else will; and after all, Mrs. Long and her nieces must stand their chance; and, therefore, as she will think it an act of kindness, if you decline the office, I will take it on myself."

The girls stared at their father. Mrs. Bennet said only, "Nonsense, nonsense!"

"What can be the meaning of that emphatic exclamation?" cried he. "Do you consider the forms of introduction, and the stress that is laid on them, as nonsense? I cannot quite agree with you there. What say you, Mary? For you are a young lady of deep reflection, I know, and read great books and make extracts."

Mary wished to say something sensible, but knew not how.

"While Mary is adjusting her ideas," he continued, "let us return to Mr. Bingley."

"I am sick of Mr. Bingley," cried his wife.

"I am sorry to hear that; but why did not you tell me that before? If I had known as much this morning I should certainly not have called on him. It is very unlucky; but as I have actually paid the visit, we cannot escape the acquaintance now."

The astonishment of the ladies was just what he wished; that of Mrs. Bennet perhaps surpassing the rest; though, when the first tumult of joy was over, she began to declare that it was what she had expected all the while.

CHAPTER 3

Not all that Mrs. Bennet, however, with the assistance of her five daughters, could ask on the subject, was sufficient to draw from her husband any satisfactory description of Mr. Bingley. They attacked him in various ways—with barefaced questions, ingenious suppositions, and distant surmises; but he eluded the skill of them all, and they were at last obliged to accept the second-hand intelligence of their neighbour, Lady Lucas.

Her report was highly favourable. Sir William had been delighted with him. He was quite young, wonderfully handsome, extremely agreeable, and, to crown the whole, he meant to be at the next assembly with a large party. Nothing could be more delightful! To be fond of dancing was a certain step towards falling in love; and very lively hopes of Mr. Bingley's heart were entertained.

Mr. Bingley was good-looking and gentlemanlike; he had a pleasant countenance, and easy, unaffected manners. His sisters were fine women, with an air of decided fashion. His brother-in-law, Mr. Hurst, merely looked the gentleman; but his friend Mr. Darcy soon drew the attention of the room by his fine, tall person, handsome features, noble mien, and the report which was in general circulation within five minutes after his entrance, of his having ten thousand a year.

The gentlemen pronounced him to be a fine figure of a man, the ladies declared he was much handsomer than Mr. Bingley, and he was looked at with great admiration for about half the evening, till his manners gave a disgust which turned the tide of his popularity; for he was discovered to be proud; to be above his company, and above being pleased; and not all his large estate in Derbyshire could then save him from having a most forbidding, disagreeable countenance, and being unworthy to be compared with his friend.`,
  },

  // 2. Frankenstein — Mary Shelley
  pg_84: {
    title: 'Frankenstein; or, The Modern Prometheus',
    author: 'Mary Wollstonecraft Shelley',
    year: 1818,
    subjects: ['Gothic Fiction', 'Science Fiction', 'Horror'],
    content: `FRANKENSTEIN; OR, THE MODERN PROMETHEUS

By Mary Wollstonecraft Shelley (1818)

LETTER 1

To Mrs. Saville, England.
St. Petersburgh, Dec. 11th, 17—.

You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.

I am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight. Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes.

CHAPTER 1

I am by birth a Genevese, and my family is one of the most distinguished of that republic. My ancestors had been for many years counsellors and syndics, and my father had filled several public situations with honour and reputation. He was respected by all who knew him for his integrity and indefatigable attention to public business.

He passed his younger days perpetually occupied by the affairs of his country; and it was not until the decline of life that he thought of marrying, and bestowing on the state sons who might carry his virtues and his name down to posterity.

CHAPTER 4

From this day natural philosophy, and particularly chemistry, in the most comprehensive sense of the term, became nearly my sole occupation. I read with ardour those works, so full of genius and discrimination, which modern inquirers have written on these subjects. I attended the lectures and cultivated the acquaintance of the men of science of the university; and I found in M. Waldman a true friend.

No one can conceive the variety of feelings which bore me onwards, like a whirlwind, catching up everything in its path, with which I began the creation of a human being. Life and death appeared to me ideal bounds, which I should first break through, and pour a torrent of light into our dark world.

CHAPTER 5

It was on a dreary night of November that I beheld the accomplishment of my toils. With an anxiety that almost amounted to agony, I collected the instruments of life around me, that I might infuse a spark of being into the lifeless thing that lay at my feet. It was already one in the morning; the rain pattered dismally against the panes, and my candle was nearly burnt out, when, by the glimmer of the half-extinguished light, I saw the dull yellow eye of the creature open; it breathed hard, and a convulsive motion agitated its limbs.

How can I describe my emotions at this catastrophe, or how delineate the wretch whom with such infinite pains and care I had endeavoured to form? His limbs were in proportion, and I had selected his features as beautiful. Beautiful! Great God! His yellow skin scarcely covered the work of muscles and arteries beneath; his hair was of a lustrous black, and flowing; his teeth of a pearly whiteness; but these luxuriances only formed a more horrid contrast with his watery eyes, that seemed almost of the same colour as the dun-white sockets in which they were set, his shrivelled complexion and straight black lips.`,
  },

  // 3. Moby-Dick — Herman Melville
  pg_2701: {
    title: 'Moby-Dick; or, The Whale',
    author: 'Herman Melville',
    year: 1851,
    subjects: ['Adventure', 'Sea Stories', 'Classic'],
    content: `MOBY-DICK; OR, THE WHALE

By Herman Melville (1851)

CHAPTER 1 — LOOMINGS

Call me Ishmael. Some years ago—never mind how long precisely—having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people's hats off—then, I account it high time to get to sea as soon as I can. This is my substitute for pistol and ball.

There now is your insular city of the Manhattoes, belted round by wharves as Indian isles by coral reefs—commerce surrounds it with her surf. Right and left, the streets take you waterward. Its extreme downtown is the battery, where that noble mole is washed by waves, and cooled by breezes, which a few hours previous were out of sight of land. Look at the crowds of water-gazers there.

CHAPTER 2 — THE CARPET-BAG

I stuffed a shirt or two into my old carpet-bag, tucked it under my arm, and started for Cape Horn and the Pacific. Quitting the good craft of Manhattan, I duly arrived in New Bedford. It was a Saturday night in December. Much was I disappointed upon learning that the little packet for Nantucket had already sailed, and that no way of reaching that place would offer, till the following Monday.

CHAPTER 3 — THE SPOUTER-INN

Entering that gable-ended Spouter-Inn, you found yourself in a wide, low, straggling entry with old-fashioned wainscots, reminding one of the bulwarks of some condemned old craft. On one side hung a very large oilpainting so thoroughly besmoked, and every way defaced, that in the unequal crosslights by which you viewed it, it was only by diligent study and a series of systematic visits to it, and careful inquiry of the neighbors, that you could any way arrive at an understanding of its purpose.

CHAPTER 36 — THE QUARTER-DECK

"D'ye see him?" cried Ahab. "Look sharp, all ye that have eyes to see! There she blows!—there she blows! A hump like a snow-hill! It is Moby Dick!"

"Captain Ahab," said Starbuck, who, with Stubb and Flask, had thus far been eyeing his superior with increasing surprise, "I came here to hunt whales, not my commander's vengeance. How many barrels will thy vengeance yield thee even if thou gettest it, Captain Ahab? it will not fetch much in our Nantucket market."

"Nantucket market! hoot! But come closer, Starbuck; thou requirest a little lower layer. If money's to be the measurer, man, and the accountants have computed their great counting-house the globe, by counting up the world's wealth in sperm oil, then is my vengeance righteous and eternal!"`,
  },

  // 4. The Picture of Dorian Gray — Oscar Wilde
  pg_174: {
    title: 'The Picture of Dorian Gray',
    author: 'Oscar Wilde',
    year: 1890,
    subjects: ['Philosophical Fiction', 'Gothic', 'Art'],
    content: `THE PICTURE OF DORIAN GRAY

By Oscar Wilde (1890)

THE PREFACE

The artist is the creator of beautiful things. To reveal art and conceal the artist is art's aim.

The critic is he who can translate into another manner or a new material his impression of beautiful things. The highest as the lowest form of criticism is a mode of autobiography.

Those who find ugly meanings in beautiful things are corrupt without being charming. This is a fault. Those who find beautiful meanings in beautiful things are the cultivated. For these there is hope. They are the elect to whom beautiful things mean only beauty.

There is no such thing as a moral or an immoral book. Books are well written, or badly written. That is all.

CHAPTER 1

The studio was filled with the rich odour of roses, and when the light summer wind stirred amidst the trees of the garden, there came through the open door the heavy scent of the lilac, or the more delicate perfume of the pink-flowering thorn.

From the corner of the divan of Persian saddle-bags on which he was lying, smoking, as was his custom, innumerable cigarettes, Lord Henry Wotton could just catch the gleam of the honey-sweet and honey-coloured blossoms of a laburnum, whose tremulous branches seemed hardly able to bear the burden of a beauty so flame-like as their own; and now and then the fantastic shadows of birds in flight flitted across the long tussore-silk curtains that were stretched in front of the huge window, producing a kind of momentary Japanese effect, and making him think of those pallid jade-faced painters of Tokio who, through the medium of an art that is necessarily immobile, seek to convey the sense of swiftness and motion.

In the centre of the room, clamped to an upright easel, stood the full-length portrait of a young man of extraordinary personal beauty, and in front of it, some little distance away, was sitting the artist himself, Basil Hallward, whose sudden disappearance some years ago caused, at the time, such public excitement, and gave rise to so many strange conjectures.

CHAPTER 2

As they entered they saw Dorian Gray. He was seated at the piano, with his back to them, turning over the pages of a volume of Schumann's "Forest Scenes."

"You must lend me these, Basil," he cried. "I want to learn them. They are perfectly charming."

"That entirely depends on how you sit today, Dorian."

"Oh, I am tired of sitting, and I don't want a life-sized portrait of myself," answered the lad, swinging round on the music-stool in a wilful, petulant manner. When he caught sight of Lord Henry, a faint blush coloured his cheeks for a moment, and he started up. "I beg your pardon, Basil, but I didn't know you had anyone with you."`,
  },

  // 5. Alice's Adventures in Wonderland — Lewis Carroll
  pg_11: {
    title: "Alice's Adventures in Wonderland",
    author: 'Lewis Carroll',
    year: 1865,
    subjects: ['Fantasy', 'Literary Nonsense', 'Adventure'],
    content: `ALICE'S ADVENTURES IN WONDERLAND

By Lewis Carroll (1865)

CHAPTER 1 — DOWN THE RABBIT-HOLE

Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice "without pictures or conversations?"

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.

There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!" (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.

In another moment down went Alice after it, never once considering how in the world she was to get out again.

CHAPTER 2 — THE POOL OF TEARS

"Curiouser and curiouser!" cried Alice (she was so much surprised, that for the moment she quite forgot how to speak good English); "now I'm opening out like the largest telescope that ever was! Good-bye, feet!" (for when she looked down at her feet, they seemed to be almost out of sight, they were getting so far off).

"Oh, my poor little feet, I wonder who will put on your shoes and stockings for you now, dears? I'm sure I shan't be able! I shall be a great deal too far off to trouble myself about you: you must manage the best way you can;—but I must be kind to them," thought Alice, "or perhaps they won't walk the way I want to go! Let me see: I'll give them a new pair of boots every Christmas."

CHAPTER 5 — ADVICE FROM A CATERPILLAR

The Caterpillar and Alice looked at each other for some time in silence: at last the Caterpillar took the hookah out of its mouth, and addressed her in a languid, sleepy voice.

"Who are you?" said the Caterpillar.

This was not an encouraging opening for a conversation. Alice replied, rather shyly, "I—I hardly know, sir, just at present—at least I know who I was when I got up this morning, but I think I must have been changed several times since then."`,
  },

  // 6. The Adventures of Sherlock Holmes — Arthur Conan Doyle
  pg_1661: {
    title: 'The Adventures of Sherlock Holmes',
    author: 'Arthur Conan Doyle',
    year: 1892,
    subjects: ['Mystery', 'Detective', 'Classics'],
    content: `THE ADVENTURES OF SHERLOCK HOLMES

By Arthur Conan Doyle (1892)

I. A SCANDAL IN BOHEMIA

To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind. He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position.

He never spoke of the softer passions, save with a gibe and a sneer. They were admirable things for the observer—excellent for drawing the veil from men's motives and actions. But for the trained reasoner to admit such intrusions into his own delicate and finely adjusted temperament was to introduce a distracting factor which might throw a doubt upon all his mental results. Grit in a sensitive instrument, or a crack in one of his own high-power lenses, would not be more disturbing than a strong emotion in a nature such as his.

One night—it was on the twentieth of March, 1888—I was returning from a journey to a patient (for I had now returned to civil practice), when my way led me through Baker Street. As I passed the well-remembered door, which must always be associated in my mind with my wooing, and with the dark incidents of the Study in Scarlet, I was seized with a keen desire to see Holmes again, and to know how he was employing his extraordinary powers.

His rooms were brilliantly lit, and, even as I looked up, I saw his tall, spare figure pass twice in a dark silhouette against the blind. He was pacing the room swiftly, eagerly, with his head sunk upon his chest and his hands clasped behind him. To me, who knew his every mood and habit, his attitude and manner told their own story. He was at work again. He had risen out of his drug-created dreams and was hot upon the scent of some new problem. I rang the bell and was shown up to the chamber which had formerly been in part my own.

His manner was not effusive. It seldom was; but he was glad, I think, to see me. With hardly a word spoken, but with a kindly eye, he waved me to an armchair, threw across his case of cigars, and indicated an acid-stained corner where there was a spirit case and a gasogene. Then he stood before the fire and looked me over in his singular introspective fashion.

"Wedlock suits you," he remarked. "I think, Watson, that you have put on seven and a half pounds since I saw you."

"Seven!" I answered.

"Indeed, I should have thought a little more. Just a trifle more, I fancy, Watson. And in practice again, I observe. You did not tell me that you intended to go into harness."

"Then, how do you know?"

"I see it, I deduce it. How do I know that you have been getting yourself very wet lately, and that you have a most clumsy and careless servant girl?"

"My dear Holmes," said I, "this is too much. You would certainly have been burned, had you lived a few centuries ago. It is quite true that I had a country walk on Thursday and came home in a dreadful mess, but as I have changed my clothes I can't imagine how you deduce it. As to Mary Jane, she is incorrigible, and my wife has given her notice; but there, again, I fail to see how you work it out."

He chuckled to himself and rubbed his long, nervous hands together.

"It is simplicity itself," said he; "my eyes tell me that on the inside of your left shoe, just where the firelight strikes it, the leather is scored by six almost parallel cuts. Obviously they have been caused by someone who has very carelessly scraped round the edges of the sole in order to remove crusted mud from it. Hence, you see, my double deduction that you had been out in vile weather, and that you had a particularly malignant boot-slitting specimen of the London slavey. As to your practice, if a gentleman walks into my rooms smelling of iodoform, with a black mark of nitrate of silver upon his right forefinger, and a bulge on the right side of his top-hat to show where he has secreted his stethoscope, I must be dull indeed, if I do not pronounce him to be an active member of the medical profession."`,
  },

  // 7. Meditations — Marcus Aurelius
  pg_2680: {
    title: 'Meditations',
    author: 'Marcus Aurelius',
    year: 180,
    subjects: ['Philosophy', 'Stoicism', 'Ancient Rome'],
    content: `MEDITATIONS

By Marcus Aurelius Antoninus (c. 180 AD)
Translated by George Long

BOOK 1 — DEBTS AND LESSONS

1. From my grandfather Verus I learned good morals and the government of my temper.

2. From the reputation and remembrance of my father, modesty and a manly character.

3. From my mother, piety and beneficence, and abstinence, not only from evil deeds, but even from evil thoughts; and further, simplicity in my way of living, far removed from the habits of the rich.

4. From my great-grandfather, not to have frequented public schools, and to have had good teachers at home, and to understand that on such things a man should spend liberally.

5. From my governor, to be neither of the green nor of the blue party at the games in the Circus, nor a partizan either of the Parmularii or the Scutarii at the gladiators' fights; from him too I learned endurance of labour, and to want little, and to work with my own hands, and not to meddle with other people's affairs, and not to be ready to listen to slander.

BOOK 2 — ON THE RIVER GRANUA

1. When you wake up in the morning, tell yourself: The people I deal with today will be meddling, ungrateful, arrogant, dishonest, jealous, and surly. They are like this because they cannot distinguish good from evil. But I have seen the beauty of good, and the ugliness of evil, and have recognized that the wrongdoer has a nature related to my own—not of the same blood or birth, but the same mind, and possessing a share of the divine.

None of them can hurt me. No one can implicate me in ugliness. Nor can I feel angry at my relative, or hate him. We were made to work together like feet, like hands, like the rows of the upper and lower teeth. To work against one another is therefore contrary to nature.

BOOK 4 — THE INNER CITADEL

3. Men seek retreats for themselves, houses in the country, seashores, and mountains; and you too are especially wont to desire such things: but this is altogether a mark of the most common sort of men, for it is in your power whenever you will to retire into yourself. For nowhere either with more quiet or more freedom from trouble does a man retire than into his own soul, particularly when he has within him such thoughts that by looking into them he is immediately in perfect tranquility; and I affirm that tranquility is nothing else than the good ordering of the mind.

Constantly then give to yourself this retreat, and renew yourself; and let your basic principles be brief and fundamental, which, as soon as you have recurred to them, will be sufficient to cleanse the soul completely, and to send you back without any irritation to the life to which you must return.`,
  },

  // 8. The Republic — Plato
  pg_1497: {
    title: 'The Republic',
    author: 'Plato',
    year: -375,
    subjects: ['Philosophy', 'Politics', 'Ethics'],
    content: `THE REPUBLIC

By Plato (c. 375 BC)
Translated by Benjamin Jowett

BOOK 1 — THE THRESHOLD OF JUSTICE

I went down yesterday to the Piraeus with Glaucon the son of Ariston, to offer up my prayers to the goddess; and also because I wanted to see in what manner they would celebrate the festival, which was a new thing. I was delighted with the procession of the inhabitants; but that of the Thracians was equally, if not more, beautiful. When we had finished our prayers and viewed the spectacle, we turned in the direction of the city; and at that instant Polemarchus the son of Cephalus chanced to catch sight of us from a distance as we were starting on our way home, and told his servant to run and bid us wait for him.

"Socrates," said Cephalus, "you don't come to see us half as often as you ought. If I were still able to go and visit you I would not ask you to come to us. But at my age I can hardly get to the city, and therefore you should come oftener to the Piraeus."

BOOK 7 — THE ALLEGORY OF THE CAVE

And now, I said, let me show in a figure how far our nature is enlightened or unenlightened: Behold! human beings living in an underground den, which has a mouth open towards the light and reaching all along the den; here they have been from their childhood, and have their legs and necks chained so that they cannot move, and can only see before them, being prevented by the chains from turning round their heads.

Above and behind them a fire is blazing at a distance, and between the fire and the prisoners there is a raised way; and you will see, if you look, a low wall built along the way, like the screen which marionette players have in front of them, over which they show the puppets.

"I see," he said.

And do you see, I said, men passing along the wall carrying all sorts of vessels, and statues and figures of animals made of wood and stone and various materials, which appear over the wall? Some of them are talking, others silent.

"You have shown me a strange image, and they are strange prisoners."

Like ourselves, I replied; and they see only their own shadows, or the shadows of one another, which the fire throws on the opposite wall of the cave.`,
  },
};

/**
 * Retrieves the instant reader content for a given search result book.
 */
export function getCuratedClassicText(
  bookIdOrKey: string,
  title?: string
): ClassicBookDefinition | null {
  if (CLASSIC_PUBLIC_DOMAIN_TEXTS[bookIdOrKey]) {
    return CLASSIC_PUBLIC_DOMAIN_TEXTS[bookIdOrKey];
  }

  // Lookup by normalized title
  if (title) {
    const normalized = title.toLowerCase().trim();
    for (const def of Object.values(CLASSIC_PUBLIC_DOMAIN_TEXTS)) {
      if (
        normalized.includes(def.title.toLowerCase()) ||
        def.title.toLowerCase().includes(normalized)
      ) {
        return def;
      }
    }
  }

  return null;
}
