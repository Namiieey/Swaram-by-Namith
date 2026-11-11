export interface Lang {
  code: string; // JioSaavn language key (lowercase)
  name: string;
  native: string;
  glyph: string;
  g: string; // gradient
  suggest: string[];
}

export const LANGS: Lang[] = [
  { code: 'malayalam', name: 'Malayalam', native: 'മലയാളം', glyph: 'മ', g: 'linear-gradient(135deg,#ff416c,#ff8a5a)', suggest: ['Sushin Shyam', 'Vineeth Sreenivasan', 'K. S. Chithra', 'Hesham Abdul Wahab', 'Vidyasagar', 'Vedan', 'Gopi Sundar', 'Bijibal', 'Sithara Krishnakumar', 'K. J. Yesudas'] },
  { code: 'hindi', name: 'Hindi', native: 'हिन्दी', glyph: 'हि', g: 'linear-gradient(135deg,#f7971e,#ffd200)', suggest: ['Arijit Singh', 'Shreya Ghoshal', 'Pritam', 'Atif Aslam', 'Jubin Nautiyal', 'Kishore Kumar', 'Lata Mangeshkar'] },
  { code: 'tamil', name: 'Tamil', native: 'தமிழ்', glyph: 'த', g: 'linear-gradient(135deg,#8e2de2,#ff5fa2)', suggest: ['Anirudh Ravichander', 'Yuvan Shankar Raja', 'A. R. Rahman', 'Sid Sriram', 'Harris Jayaraj', 'Ilaiyaraaja'] },
  { code: 'telugu', name: 'Telugu', native: 'తెలుగు', glyph: 'తె', g: 'linear-gradient(135deg,#00c6ff,#0072ff)', suggest: ['Devi Sri Prasad', 'S. Thaman', 'Sid Sriram', 'M. M. Keeravani', 'Anurag Kulkarni'] },
  { code: 'kannada', name: 'Kannada', native: 'ಕನ್ನಡ', glyph: 'ಕ', g: 'linear-gradient(135deg,#f12711,#f5af19)', suggest: ['Vijay Prakash', 'Arjun Janya', 'Rajesh Krishnan', 'Sonu Nigam', 'Ravi Basrur'] },
  { code: 'english', name: 'English', native: 'English', glyph: 'Aa', g: 'linear-gradient(135deg,#2c3e50,#4ca1af)', suggest: ['Taylor Swift', 'The Weeknd', 'Ed Sheeran', 'Dua Lipa', 'Billie Eilish', 'Coldplay'] },
  { code: 'punjabi', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', glyph: 'ਪ', g: 'linear-gradient(135deg,#11998e,#38ef7d)', suggest: ['Diljit Dosanjh', 'AP Dhillon', 'Sidhu Moose Wala', 'Karan Aujla'] },
  { code: 'bengali', name: 'Bengali', native: 'বাংলা', glyph: 'বা', g: 'linear-gradient(135deg,#ee0979,#ff6a00)', suggest: ['Anupam Roy', 'Arijit Singh', 'Hemanta Mukherjee', 'Kishore Kumar'] },
  { code: 'marathi', name: 'Marathi', native: 'मराठी', glyph: 'म', g: 'linear-gradient(135deg,#5433ff,#20bdff)', suggest: ['Ajay-Atul', 'Shankar Mahadevan', 'Adarsh Shinde', 'Avadhoot Gupte'] },
  { code: 'gujarati', name: 'Gujarati', native: 'ગુજરાતી', glyph: 'ગુ', g: 'linear-gradient(135deg,#ff9966,#ff5e62)', suggest: ['Kinjal Dave', 'Aditya Gadhvi', 'Jigardan Gadhavi'] },
  { code: 'bhojpuri', name: 'Bhojpuri', native: 'भोजपुरी', glyph: 'भो', g: 'linear-gradient(135deg,#7f7fd5,#86a8e7)', suggest: ['Pawan Singh', 'Khesari Lal Yadav', 'Shilpi Raj'] },
  { code: 'haryanvi', name: 'Haryanvi', native: 'हरियाणवी', glyph: 'ह', g: 'linear-gradient(135deg,#56ab2f,#a8e063)', suggest: ['Sapna Choudhary', 'Renuka Panwar', 'Masoom Sharma'] },
  { code: 'rajasthani', name: 'Rajasthani', native: 'राजस्थानी', glyph: 'रा', g: 'linear-gradient(135deg,#d38312,#a83279)', suggest: ['Seema Mishra', 'Mame Khan'] },
  { code: 'odia', name: 'Odia', native: 'ଓଡ଼ିଆ', glyph: 'ଓ', g: 'linear-gradient(135deg,#00b09b,#96c93d)', suggest: ['Humane Sagar', 'Asima Panda'] },
  { code: 'assamese', name: 'Assamese', native: 'অসমীয়া', glyph: 'অ', g: 'linear-gradient(135deg,#3a7bd5,#00d2ff)', suggest: ['Zubeen Garg', 'Papon'] },
  { code: 'urdu', name: 'Urdu', native: 'اردو', glyph: 'ا', g: 'linear-gradient(135deg,#614385,#516395)', suggest: ['Nusrat Fateh Ali Khan', 'Rahat Fateh Ali Khan', 'Abida Parveen'] }
];

export const langOf = (code: string) => LANGS.find(l => l.code === code);
export const langName = (code: string) => langOf(code)?.name ?? code.replace(/^./, c => c.toUpperCase());

export interface Mood { k: string; en: string; q: string; g: string; }
export const MOODS: Mood[] = [
  { k: 'romance', en: 'Romance', q: 'romantic songs', g: 'linear-gradient(135deg,#ff416c,#ff9a5a)' },
  { k: 'melody', en: 'Melody', q: 'melody hits', g: 'linear-gradient(135deg,#5b6bff,#8fa8ff)' },
  { k: 'retro', en: 'Retro Gold', q: 'old classic songs', g: 'linear-gradient(135deg,#c78a2c,#f1c76b)' },
  { k: 'mass', en: 'Party & Mass', q: 'mass dance songs', g: 'linear-gradient(135deg,#e52d27,#b31217)' },
  { k: 'sad', en: 'Heartbreak', q: 'sad songs', g: 'linear-gradient(135deg,#2c3e70,#4b6cb7)' },
  { k: 'devo', en: 'Devotional', q: 'devotional songs', g: 'linear-gradient(135deg,#f09819,#edde5d)' },
  { k: 'rap', en: 'Hip-Hop & Indie', q: 'hip hop rap independent', g: 'linear-gradient(135deg,#7f00ff,#e100ff)' },
  { k: 'fest', en: 'Festive', q: 'festival celebration songs', g: 'linear-gradient(135deg,#11998e,#38ef7d)' },
  { k: 'chill', en: 'Chill & Lo-fi', q: 'lofi chill songs', g: 'linear-gradient(135deg,#0f2027,#2c5364)' },
  { k: 'workout', en: 'Workout', q: 'energetic workout songs', g: 'linear-gradient(135deg,#f953c6,#b91d73)' }
];
