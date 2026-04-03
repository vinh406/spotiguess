import type { Song } from './types';

const MOCK_SONGS: Song[] = [
  { id: '1', title: 'Blinding Lights', artist: 'The Weeknd', album: 'After Hours', albumImageUrl: 'https://picsum.photos/seed/song1/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', duration: 200000 },
  { id: '2', title: 'Shape of You', artist: 'Ed Sheeran', album: 'Divide', albumImageUrl: 'https://picsum.photos/seed/song2/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3', duration: 234000 },
  { id: '3', title: 'Bad Guy', artist: 'Billie Eilish', album: 'When We All Fall Asleep', albumImageUrl: 'https://picsum.photos/seed/song3/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3', duration: 194000 },
  { id: '4', title: 'Levitating', artist: 'Dua Lipa', album: 'Future Nostalgia', albumImageUrl: 'https://picsum.photos/seed/song4/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3', duration: 203000 },
  { id: '5', title: 'Watermelon Sugar', artist: 'Harry Styles', album: 'Fine Line', albumImageUrl: 'https://picsum.photos/seed/song5/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3', duration: 174000 },
  { id: '6', title: 'Don\'t Start Now', artist: 'Dua Lipa', album: 'Future Nostalgia', albumImageUrl: 'https://picsum.photos/seed/song6/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3', duration: 183000 },
  { id: '7', title: 'Peaches', artist: 'Justin Bieber', album: 'Justice', albumImageUrl: 'https://picsum.photos/seed/song7/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3', duration: 198000 },
  { id: '8', title: 'Save Your Tears', artist: 'The Weeknd', album: 'After Hours', albumImageUrl: 'https://picsum.photos/seed/song8/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3', duration: 216000 },
  { id: '9', title: 'Kiss Me More', artist: 'Doja Cat', album: 'Planet Her', albumImageUrl: 'https://picsum.photos/seed/song9/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3', duration: 208000 },
  { id: '10', title: 'Montero', artist: 'Lil Nas X', album: 'Montero', albumImageUrl: 'https://picsum.photos/seed/song10/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3', duration: 137000 },
  { id: '11', title: 'Good 4 U', artist: 'Olivia Rodrigo', album: 'SOUR', albumImageUrl: 'https://picsum.photos/seed/song11/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3', duration: 178000 },
  { id: '12', title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', album: 'F*ck Love 3', albumImageUrl: 'https://picsum.photos/seed/song12/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3', duration: 141000 },
  { id: '13', title: 'Heat Waves', artist: 'Glass Animals', album: 'Dreamland', albumImageUrl: 'https://picsum.photos/seed/song13/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-13.mp3', duration: 239000 },
  { id: '14', title: 'Industry Baby', artist: 'Lil Nas X & Jack Harlow', album: 'Montero', albumImageUrl: 'https://picsum.photos/seed/song14/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-14.mp3', duration: 212000 },
  { id: '15', title: 'Happier Than Ever', artist: 'Billie Eilish', album: 'Happier Than Ever', albumImageUrl: 'https://picsum.photos/seed/song15/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3', duration: 298000 },
  { id: '16', title: 'Butter', artist: 'BTS', album: 'Butter', albumImageUrl: 'https://picsum.photos/seed/song16/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3', duration: 164000 },
  { id: '17', title: 'Deja Vu', artist: 'Olivia Rodrigo', album: 'SOUR', albumImageUrl: 'https://picsum.photos/seed/song17/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-17.mp3', duration: 215000 },
  { id: '18', title: 'Positions', artist: 'Ariana Grande', album: 'Positions', albumImageUrl: 'https://picsum.photos/seed/song18/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-18.mp3', duration: 172000 },
  { id: '19', title: 'Dynamite', artist: 'BTS', album: 'BE', albumImageUrl: 'https://picsum.photos/seed/song19/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-19.mp3', duration: 199000 },
  { id: '20', title: 'Drivers License', artist: 'Olivia Rodrigo', album: 'SOUR', albumImageUrl: 'https://picsum.photos/seed/song20/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-20.mp3', duration: 242000 },
  { id: '21', title: 'Mood', artist: '24kGoldn ft. iann dior', album: 'El Dorado', albumImageUrl: 'https://picsum.photos/seed/song21/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-21.mp3', duration: 141000 },
  { id: '22', title: 'Therefore I Am', artist: 'Billie Eilish', album: 'Happier Than Ever', albumImageUrl: 'https://picsum.photos/seed/song22/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-22.mp3', duration: 174000 },
  { id: '23', title: '34+35', artist: 'Ariana Grande', album: 'Positions', albumImageUrl: 'https://picsum.photos/seed/song23/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-23.mp3', duration: 173000 },
  { id: '24', title: 'Willow', artist: 'Taylor Swift', album: 'Evermore', albumImageUrl: 'https://picsum.photos/seed/song24/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-24.mp3', duration: 214000 },
  { id: '25', title: 'Astronaut In The Ocean', artist: 'Masked Wolf', album: 'Astronaut In The Ocean', albumImageUrl: 'https://picsum.photos/seed/song25/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-25.mp3', duration: 132000 },
  { id: '26', title: 'Calling My Phone', artist: 'Lil Tjay ft. 6LACK', album: 'Destined 2 Win', albumImageUrl: 'https://picsum.photos/seed/song26/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-26.mp3', duration: 186000 },
  { id: '27', title: 'Up', artist: 'Cardi B', album: 'Up', albumImageUrl: 'https://picsum.photos/seed/song27/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-27.mp3', duration: 173000 },
  { id: '28', title: 'Best Friend', artist: 'Saweetie ft. Doja Cat', album: 'Pretty Bitch Music', albumImageUrl: 'https://picsum.photos/seed/song28/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-28.mp3', duration: 184000 },
  { id: '29', title: 'Rapstar', artist: 'Polo G', album: 'Hall of Fame', albumImageUrl: 'https://picsum.photos/seed/song29/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-29.mp3', duration: 177000 },
  { id: '30', title: 'Leave The Door Open', artist: 'Silk Sonic', album: 'An Evening with Silk Sonic', albumImageUrl: 'https://picsum.photos/seed/song30/300/300', previewUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-30.mp3', duration: 242000 },
];

export function selectSongsForGame(count: number): Song[] {
  const shuffled = [...MOCK_SONGS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
