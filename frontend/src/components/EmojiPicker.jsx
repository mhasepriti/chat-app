import { useState, useRef, useEffect, useMemo } from 'react'
import {
  Smile,
  Heart,
  User,
  Coffee,
  Sparkles,
  Trophy,
  Search,
  X,
  Flame,
} from 'lucide-react'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🔥', '🎉', '😍', '🙏', '✨', '🚀', '💯']

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: Smile,
    emojis: [
      { e: '😀', k: 'smile happy grinning' },
      { e: '😃', k: 'smile happy joy' },
      { e: '😄', k: 'smile laugh happy' },
      { e: '😁', k: 'grin teeth beaming' },
      { e: '😆', k: 'laugh closed eyes funny' },
      { e: '😅', k: 'sweat smile relief' },
      { e: '😂', k: 'joy laugh tears funny lol' },
      { e: '🤣', k: 'rofl rolling laughing funny' },
      { e: '🥲', k: 'smile tear proud grateful' },
      { e: '🥹', k: 'pleading holding tears watery' },
      { e: '☺️', k: 'blush relaxed calm' },
      { e: '😊', k: 'blush happy sweet' },
      { e: '😇', k: 'angel halo innocent' },
      { e: '🙂', k: 'slight smile fine' },
      { e: '🙃', k: 'upside down silly sarcasm' },
      { e: '😉', k: 'wink playful secret' },
      { e: '😌', k: 'relieved peaceful zen' },
      { e: '😍', k: 'heart eyes love crush' },
      { e: '🥰', k: 'hearts love warm affectionate' },
      { e: '😘', k: 'blow kiss love romantic' },
      { e: '😗', k: 'kiss whistling' },
      { e: '😙', k: 'kiss smile' },
      { e: '😚', k: 'kiss closed eyes' },
      { e: '😋', k: 'yum delicious tongue tasty' },
      { e: '😛', k: 'tongue silly joke' },
      { e: '😝', k: 'tongue squint squinting' },
      { e: '😜', k: 'wink tongue crazy' },
      { e: '🤪', k: 'zany goofy crazy wild' },
      { e: '🤨', k: 'raised eyebrow suspicious skeptic' },
      { e: '🧐', k: 'monocle curious observing' },
      { e: '🤓', k: 'nerd smart glasses geek' },
      { e: '😎', k: 'cool sunglasses chill boss' },
      { e: '🥸', k: 'disguise mustache glasses' },
      { e: '🤩', k: 'star eyes excited amazed' },
      { e: '🥳', k: 'party celebrate horn confetti' },
      { e: '😏', k: 'smirk flirt sly smirk' },
      { e: '😒', k: 'unamused annoyed bored' },
      { e: '😞', k: 'disappointed sad bummed' },
      { e: '😔', k: 'pensive sad lonely thoughtful' },
      { e: '😟', k: 'worried nervous anxious' },
      { e: '😕', k: 'confused puzzled unsure' },
      { e: '🙁', k: 'slight frown sad' },
      { e: '☹️', k: 'frown unhappy sad' },
      { e: '😣', k: 'persevere struggling pain' },
      { e: '😖', k: 'confounded upset frustrated' },
      { e: '😫', k: 'tired exhausted upset' },
      { e: '😩', k: 'weary groan done' },
      { e: '🥺', k: 'pleading puppy eyes please' },
      { e: '😢', k: 'cry tear sad' },
      { e: '😭', k: 'sob crying tears loud' },
      { e: '😮‍💨', k: 'sigh exhale relief exhausted' },
      { e: '😤', k: 'triumph huff proud steam' },
      { e: '😠', k: 'angry mad annoyed' },
      { e: '😡', k: 'pout rage red angry' },
      { e: '🤬', k: 'cursing swear angry rage' },
      { e: '🤯', k: 'exploding head mind blown shock' },
      { e: '😳', k: 'flushed surprised blush wide' },
      { e: '🥵', k: 'hot sweat red sweating heat' },
      { e: '🥶', k: 'cold freezing blue ice chill' },
      { e: '😱', k: 'scream fear shock horror' },
      { e: '😨', k: 'fearful scared nervous' },
      { e: '😰', k: 'anxious blue sweat nervous' },
      { e: '😥', k: 'sad relieved sweat' },
      { e: '😓', k: 'downcast sweat work hard' },
      { e: '🤗', k: 'hug open hands warmth' },
      { e: '🫡', k: 'salute respect yes sir' },
      { e: '🤔', k: 'thinking ponder hmm think' },
      { e: '🫣', k: 'peeking eye scared shy' },
      { e: '🤭', k: 'giggle hand over mouth oops' },
      { e: '🫢', k: 'gasp shock disbelief' },
      { e: '🤫', k: 'shh quiet secret silence' },
      { e: '🫠', k: 'melting overwhelmed sarcasm' },
      { e: '🤥', k: 'liar pinocchio nose' },
      { e: '😶', k: 'no mouth speechless blank' },
      { e: '😐', k: 'neutral poker face straight' },
      { e: '😑', k: 'expressionless done meh' },
      { e: '😬', k: 'grimace awkward yikes' },
      { e: '🙄', k: 'rolling eyes whatever scoff' },
      { e: '😯', k: 'surprised hushed wow' },
      { e: '😦', k: 'frowning open mouth surprise' },
      { e: '😧', k: 'anguished shocked' },
      { e: '😮', k: 'open mouth wow oh' },
      { e: '😲', k: 'astonished shocked amazed' },
      { e: '🥱', k: 'yawn tired sleepy' },
      { e: '😴', k: 'sleeping zzz night asleep' },
      { e: '🤤', k: 'drool hungry sleep' },
      { e: '😪', k: 'sleepy bubble' },
      { e: '😵', k: 'dizzy knocked out shock' },
      { e: '😵‍💫', k: 'spiral dizzy confusion' },
      { e: '🤐', k: 'zipper mouth silent secret' },
      { e: '🥴', k: 'woozy drunk tipsy dizzy' },
      { e: '🤢', k: 'nauseated green sick gross' },
      { e: '🤮', k: 'vomit barf sick puke' },
      { e: '🤧', k: 'sneeze sick cold flu' },
      { e: '😷', k: 'mask sick virus doctor' },
      { e: '🤒', k: 'thermometer fever sick ill' },
      { e: '🤕', k: 'bandage hurt head injured' },
      { e: '🤑', k: 'money dollar rich rich' },
      { e: '🤠', k: 'cowboy hat western yeehaw' },
      { e: '😈', k: 'devil horn purple smile evil' },
      { e: '👿', k: 'imp angry devil' },
      { e: '💀', k: 'skull dead skeleton dying lol' },
      { e: '☠️', k: 'crossbones danger pirate skull' },
      { e: '💩', k: 'poop funny brown crap' },
      { e: '🤡', k: 'clown foolish circus joke' },
      { e: '👻', k: 'ghost boo spooky halloween' },
      { e: '👽', k: 'alien ufo martian' },
      { e: '🤖', k: 'robot tech bot ai' },
    ],
  },
  {
    id: 'gestures',
    name: 'People & Hands',
    icon: User,
    emojis: [
      { e: '👋', k: 'wave hello goodbye hi' },
      { e: '🤚', k: 'raised back hand stop' },
      { e: '🖐️', k: 'hand fingers spread five' },
      { e: '✋', k: 'hand high five stop' },
      { e: '🖖', k: 'vulcan spock peace' },
      { e: '🫱', k: 'right hand point' },
      { e: '🫲', k: 'left hand point' },
      { e: '🫳', k: 'palm down drop' },
      { e: '🫴', k: 'palm up offer' },
      { e: '👌', k: 'ok okay perfect agree' },
      { e: '🤌', k: 'pinched fingers italian chef' },
      { e: '🤏', k: 'pinching little bit small' },
      { e: '✌️', k: 'victory peace v two' },
      { e: '🤞', k: 'crossed fingers luck hope' },
      { e: '🫰', k: 'finger heart snap kpop' },
      { e: '🤟', k: 'love you gesture rock' },
      { e: '🤘', k: 'rock on horns metal' },
      { e: '🤙', k: 'call me shaka chill' },
      { e: '👈', k: 'point left direction' },
      { e: '👉', k: 'point right direction' },
      { e: '👆', k: 'point up this' },
      { e: '👇', k: 'point down below' },
      { e: '☝️', k: 'index finger one moment' },
      { e: '🫵', k: 'point you user' },
      { e: '👍', k: 'thumbs up good yes like agree' },
      { e: '👎', k: 'thumbs down bad no dislike' },
      { e: '✊', k: 'fist power strength' },
      { e: '👊', k: 'punch fist bump attack' },
      { e: '🤛', k: 'left fist bump' },
      { e: '🤜', k: 'right fist bump' },
      { e: '👏', k: 'clap applause kudos bravo' },
      { e: '🙌', k: 'raising hands celebrate praise' },
      { e: '🫶', k: 'heart hands love support' },
      { e: '👐', k: 'open hands warmth hug' },
      { e: '🤲', k: 'palms up pray offering' },
      { e: '🤝', k: 'handshake deal agreement partner' },
      { e: '🙏', k: 'pray please thank you namaste' },
      { e: '✍️', k: 'writing pen paper exam' },
      { e: '💅', k: 'nail polish sassy diva glam' },
      { e: '🤳', k: 'selfie camera photo' },
      { e: '💪', k: 'muscle flex strong gym' },
      { e: '👀', k: 'eyes look watching sneaky' },
      { e: '👁️', k: 'eye look seeing' },
      { e: '👅', k: 'tongue taste lick' },
      { e: '👄', k: 'mouth lips kiss speak' },
      { e: '🫦', k: 'biting lip flirt nervous' },
      { e: '💋', k: 'kiss mark lips lipstick' },
      { e: '🫂', k: 'hugging people care love' },
    ],
  },
  {
    id: 'hearts',
    name: 'Hearts & Love',
    icon: Heart,
    emojis: [
      { e: '❤️', k: 'red heart love passion' },
      { e: '🧡', k: 'orange heart friendship' },
      { e: '💛', k: 'yellow heart loyalty gold' },
      { e: '💚', k: 'green heart nature jealous' },
      { e: '💙', k: 'blue heart peace trust' },
      { e: '💜', k: 'purple heart magic royalty' },
      { e: '🖤', k: 'black heart dark gothic' },
      { e: '🤍', k: 'white heart pure peace' },
      { e: '🤎', k: 'brown heart warm earth' },
      { e: '💔', k: 'broken heart heartbreak sad' },
      { e: '❤️‍🔥', k: 'heart on fire passion burning' },
      { e: '❤️‍🩹', k: 'mending heart healing recovery' },
      { e: '❣️', k: 'heart exclamation love' },
      { e: '💕', k: 'two hearts love sweet' },
      { e: '💞', k: 'revolving hearts love' },
      { e: '💓', k: 'beating heart pulse love' },
      { e: '💗', k: 'growing heart emotion' },
      { e: '💖', k: 'sparkle heart cute glow' },
      { e: '💘', k: 'cupid arrow heart love' },
      { e: '💝', k: 'gift heart ribbon love' },
      { e: '💟', k: 'heart decoration purple' },
      { e: '✨', k: 'sparkles stars magic clean' },
      { e: '🔥', k: 'fire lit hot lit amazing' },
      { e: '💯', k: '100 hundred perfect percent' },
      { e: '🌟', k: 'star glowing bright' },
      { e: '⭐', k: 'star gold favorite' },
      { e: '⚡', k: 'lightning bolt fast electric' },
      { e: '💥', k: 'boom collision explosion pow' },
    ],
  },
  {
    id: 'activities',
    name: 'Activities & Fun',
    icon: Trophy,
    emojis: [
      { e: '🎉', k: 'party popper confetti celebrate tada' },
      { e: '🎊', k: 'confetti ball celebration' },
      { e: '🎈', k: 'balloon party birthday' },
      { e: '🎁', k: 'gift present birthday wrap' },
      { e: '🏆', k: 'trophy winner gold first' },
      { e: '🥇', k: 'first medal gold winner' },
      { e: '🥈', k: 'second medal silver' },
      { e: '🥉', k: 'third medal bronze' },
      { e: '🎮', k: 'game video game controller play' },
      { e: '🕹️', k: 'joystick arcade gaming' },
      { e: '🎲', k: 'dice game board luck' },
      { e: '🧩', k: 'puzzle piece solve mystery' },
      { e: '⚽', k: 'soccer football ball sport' },
      { e: '🏀', k: 'basketball ball hoop sport' },
      { e: '🏈', k: 'american football ball sport' },
      { e: '⚾', k: 'baseball ball sport' },
      { e: '🎾', k: 'tennis ball sport match' },
      { e: '🏐', k: 'volleyball ball beach' },
      { e: '🏓', k: 'ping pong table tennis' },
      { e: '🏸', k: 'badminton racket sport' },
      { e: '🥊', k: 'boxing glove fight punch' },
      { e: '🥋', k: 'martial arts karate judo' },
      { e: '🎯', k: 'target bullseye goal accurate' },
      { e: '🎳', k: 'bowling strike pins' },
      { e: '🎨', k: 'art palette paint artist' },
      { e: '🎬', k: 'movie cinema film action' },
      { e: '🎤', k: 'microphone karaoke singing' },
      { e: '🎧', k: 'headphones music audio' },
      { e: '🎵', k: 'music note song melody' },
      { e: '🎶', k: 'musical notes tunes rhythm' },
      { e: '🎸', k: 'guitar rock instrument' },
    ],
  },
  {
    id: 'food',
    name: 'Food & Drink',
    icon: Coffee,
    emojis: [
      { e: '☕', k: 'coffee cup hot cafe morning tea' },
      { e: '🍵', k: 'tea green matcha' },
      { e: '🧋', k: 'boba bubble tea milk' },
      { e: '🥤', k: 'cup soda drink cold' },
      { e: '🍺', k: 'beer drink alcohol cheers' },
      { e: '🍻', k: 'beers clinking cheers party' },
      { e: '🍷', k: 'wine glass red alcohol' },
      { e: '🥂', k: 'champagne glasses toast celebration' },
      { e: '🍕', k: 'pizza cheese slice food' },
      { e: '🍔', k: 'burger hamburger fast food' },
      { e: '🍟', k: 'french fries chips mcdonalds' },
      { e: '🌭', k: 'hot dog sausage food' },
      { e: '🥪', k: 'sandwich lunch sub' },
      { e: '🌮', k: 'taco mexican food' },
      { e: '🌯', k: 'burrito wrap food' },
      { e: '🍜', k: 'noodles ramen soup asian' },
      { e: '🍝', k: 'spaghetti pasta italian' },
      { e: '🍣', k: 'sushi japanese fish food' },
      { e: '🍱', k: 'bento box lunch japanese' },
      { e: '🎂', k: 'birthday cake sweet celebration' },
      { e: '🍰', k: 'cake slice sweet dessert' },
      { e: '🧁', k: 'cupcake sweet muffin' },
      { e: '🍩', k: 'donut doughnut sweet dessert' },
      { e: '🍪', k: 'cookie chocolate sweet biscuit' },
      { e: '🍫', k: 'chocolate bar sweet candy' },
      { e: '🍦', k: 'ice cream soft cone sweet' },
      { e: '🍧', k: 'shaved ice dessert' },
      { e: '🍎', k: 'apple fruit red healthy' },
      { e: '🍉', k: 'watermelon fruit summer' },
      { e: '🍇', k: 'grapes fruit wine' },
      { e: '🍓', k: 'strawberry fruit red berry' },
      { e: '🥭', k: 'mango fruit tropical sweet' },
    ],
  },
  {
    id: 'nature_objects',
    name: 'Nature & Objects',
    icon: Sparkles,
    emojis: [
      { e: '🚀', k: 'rocket ship space launch blastoff' },
      { e: '🛸', k: 'ufo flying saucer alien' },
      { e: '✈️', k: 'airplane flight travel vacation' },
      { e: '🚗', k: 'car automobile drive travel' },
      { e: '🏎️', k: 'race car fast f1' },
      { e: '🏍️', k: 'motorcycle bike ride' },
      { e: '🛵', k: 'scooter vespa moped' },
      { e: '🚲', k: 'bicycle bike cycle' },
      { e: '💻', k: 'laptop computer tech coding' },
      { e: '📱', k: 'phone mobile smartphone tech' },
      { e: '💡', k: 'light bulb idea brainstorm smart' },
      { e: '💰', k: 'money bag cash wealth rich' },
      { e: '💸', k: 'money wings flying cash lost' },
      { e: '💎', k: 'diamond gem precious crystal' },
      { e: '🔑', k: 'key password unlock access' },
      { e: '🔒', k: 'lock secure locked privacy' },
      { e: '🐶', k: 'dog puppy pet animal bark' },
      { e: '🐱', k: 'cat kitten pet animal meow' },
      { e: '🦁', k: 'lion king animal wild' },
      { e: '🐼', k: 'panda bear cute animal' },
      { e: '🦊', k: 'fox animal sly wild' },
      { e: '🐻', k: 'bear animal grizzly cute' },
      { e: '🐨', k: 'koala animal cute australia' },
      { e: '🐯', k: 'tiger animal wild fierce' },
      { e: '🦄', k: 'unicorn magic fantasy horse' },
      { e: '🌸', k: 'cherry blossom flower pink spring' },
      { e: '🌺', k: 'hibiscus flower tropical' },
      { e: '🌹', k: 'rose flower red romantic love' },
      { e: '🌻', k: 'sunflower flower yellow sun' },
      { e: '🍀', k: 'four leaf clover luck lucky irish' },
      { e: '🌈', k: 'rainbow colorful weather pride' },
      { e: '☀️', k: 'sun sunny bright warm weather' },
      { e: '🌙', k: 'crescent moon night sleep' },
    ],
  },
]

export default function EmojiPicker({ onSelectEmoji, onClose }) {
  const [activeCategory, setActiveCategory] = useState('smileys')
  const [search, setSearch] = useState('')
  const pickerRef = useRef(null)
  const searchInputRef = useRef(null)

  // Focus search input on open
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose?.()
      }
    }
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  // Filter emojis based on search query
  const filteredEmojis = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null

    const results = []
    const seen = new Set()

    for (const cat of EMOJI_CATEGORIES) {
      for (const item of cat.emojis) {
        if (!seen.has(item.e) && (item.k.includes(q) || item.e === q)) {
          results.push(item)
          seen.add(item.e)
        }
      }
    }
    return results
  }, [search])

  const currentCatObj = useMemo(
    () => EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0],
    [activeCategory]
  )

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full mb-3 right-0 sm:right-auto sm:left-2 w-[340px] sm:w-[380px] max-w-[calc(100vw-24px)] bg-dark-700/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col animate-fade-in"
      style={{ maxHeight: '420px' }}
    >
      {/* Header with Search and Close */}
      <div className="p-3 border-b border-white/5 flex items-center gap-2 bg-dark-800/60">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            className="w-full bg-dark-600/70 text-gray-100 text-xs rounded-xl pl-9 pr-7 py-2 outline-none border border-white/5 focus:border-brand-500/50 transition-colors placeholder-gray-500"
            placeholder="Search emojis (smile, heart, fire, ok)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={13} />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          title="Close emoji picker"
        >
          <X size={16} />
        </button>
      </div>

      {/* Quick Reactions Bar (when not searching) */}
      {!search && (
        <div className="px-3 py-2 border-b border-white/5 bg-dark-800/30 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          <span className="text-[10px] text-gray-500 font-medium mr-1 flex items-center gap-1">
            <Flame size={11} className="text-amber-400" /> Quick:
          </span>
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSelectEmoji(emoji)}
              className="w-7 h-7 flex items-center justify-center text-base hover:bg-white/10 rounded-lg transition-transform hover:scale-125 active:scale-95 flex-shrink-0"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Category Tabs (when not searching) */}
      {!search && (
        <div className="flex items-center px-2 py-1.5 border-b border-white/5 bg-dark-800/40 gap-1 overflow-x-auto scrollbar-none">
          {EMOJI_CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const isActive = activeCategory === cat.id
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`p-1.5 rounded-lg flex items-center justify-center transition-colors flex-shrink-0 ${
                  isActive
                    ? 'bg-brand-600/30 text-brand-300 border border-brand-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
                title={cat.name}
              >
                <Icon size={16} />
              </button>
            )
          })}
        </div>
      )}

      {/* Emoji Grid Area */}
      <div className="flex-1 overflow-y-auto p-3 max-h-[260px]">
        {search ? (
          <div>
            <p className="text-[11px] font-medium text-gray-400 mb-2 px-1">
              Search Results ({filteredEmojis.length})
            </p>
            {filteredEmojis.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs">
                No emojis found for "{search}"
              </div>
            ) : (
              <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
                {filteredEmojis.map((item, idx) => (
                  <button
                    key={`${item.e}-${idx}`}
                    onClick={() => onSelectEmoji(item.e)}
                    className="w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 rounded-xl transition-transform hover:scale-125 active:scale-95"
                    title={item.k}
                  >
                    {item.e}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-[11px] font-medium text-gray-400 mb-2 px-1">
              {currentCatObj.name}
            </p>
            <div className="grid grid-cols-7 sm:grid-cols-8 gap-1.5">
              {currentCatObj.emojis.map((item, idx) => (
                <button
                  key={`${item.e}-${idx}`}
                  onClick={() => onSelectEmoji(item.e)}
                  className="w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 rounded-xl transition-transform hover:scale-125 active:scale-95"
                  title={item.k}
                >
                  {item.e}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 bg-dark-800/80 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-500">
        <span>Click emoji to insert</span>
        <span>Esc to close</span>
      </div>
    </div>
  )
}
