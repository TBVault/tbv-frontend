'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Helper function to format seconds to HH:MM:SS
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

interface TranscriptItem {
  public_id: string;
  title: string;
  summary: string | null;
  duration: number;
  tags: string[];
  source: string;
}

// Mock data generator - returns different data based on page number
function getMockTranscripts(page: number): { transcripts: TranscriptItem[]; totalPages: number } {
  const allMockTranscripts: TranscriptItem[] = [
    {
      public_id: 'transcript-1',
      title: 'The Philosophy of Devotion: Understanding Bhakti Yoga',
      summary: 'An in-depth exploration of Bhakti Yoga and its principles, discussing the path of devotion and its role in spiritual practice.',
      duration: 3240,
      tags: ['Philosophy', 'Spirituality', 'Yoga'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-2',
      title: 'Meditation and Mindfulness in Daily Life',
      summary: 'Practical guidance on incorporating meditation practices into everyday routines for better mental clarity and peace.',
      duration: 1860,
      tags: ['Meditation', 'Mindfulness', 'Wellness'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-3',
      title: 'Sacred Texts: Exploring Ancient Wisdom',
      summary: 'A discussion on the significance of sacred texts and how they continue to guide spiritual seekers today.',
      duration: 4200,
      tags: ['Philosophy', 'Sacred Texts', 'Discussion'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-4',
      title: 'The Path of Self-Realization',
      summary: 'Understanding the journey towards self-realization and the obstacles one might encounter along the way.',
      duration: 2760,
      tags: ['Spirituality', 'Self-Development'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-5',
      title: 'Community and Spiritual Growth',
      summary: 'How being part of a spiritual community can support and enhance personal growth and understanding.',
      duration: 1980,
      tags: ['Community', 'Spirituality', 'Discussion'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-6',
      title: 'Karma and Dharma: Understanding Life\'s Purpose',
      summary: 'Exploring the concepts of karma and dharma and their relevance in modern spiritual practice.',
      duration: 3600,
      tags: ['Philosophy', 'Karma', 'Dharma'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-7',
      title: 'The Power of Mantras and Chanting',
      summary: 'An examination of mantras, their origins, and how chanting can transform consciousness.',
      duration: 2340,
      tags: ['Mantras', 'Chanting', 'Spirituality'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-8',
      title: 'Guru-Disciple Relationship in Modern Times',
      summary: 'Discussing the traditional guru-disciple relationship and how it adapts to contemporary spiritual contexts.',
      duration: 3120,
      tags: ['Philosophy', 'Tradition', 'Discussion'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-9',
      title: 'Yoga Beyond Asanas: The Eight Limbs',
      summary: 'A comprehensive look at Patanjali\'s Eight Limbs of Yoga and their application beyond physical postures.',
      duration: 2880,
      tags: ['Yoga', 'Philosophy', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-10',
      title: 'Compassion and Service: The Path of Seva',
      summary: 'Understanding seva (selfless service) as a spiritual practice and its transformative power.',
      duration: 2100,
      tags: ['Service', 'Compassion', 'Spirituality'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-11',
      title: 'Ancient Wisdom for Modern Challenges',
      summary: 'How timeless spiritual teachings can help navigate contemporary life challenges and find meaning.',
      duration: 3420,
      tags: ['Philosophy', 'Modern Life', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-12',
      title: 'The Science of Consciousness',
      summary: 'Exploring the intersection of science and spirituality in understanding consciousness and awareness.',
      duration: 2700,
      tags: ['Science', 'Consciousness', 'Discussion'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-13',
      title: 'Pranayama: The Art of Breath Control',
      summary: 'Learning the techniques and benefits of pranayama breathing exercises in yoga practice.',
      duration: 2400,
      tags: ['Yoga', 'Pranayama', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-14',
      title: 'The Bhagavad Gita: Timeless Teachings',
      summary: 'Exploring the profound wisdom contained in the Bhagavad Gita and its relevance today.',
      duration: 3900,
      tags: ['Sacred Texts', 'Philosophy', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-15',
      title: 'Detachment and Non-Attachment',
      summary: 'Understanding the difference between detachment and non-attachment in spiritual practice.',
      duration: 2250,
      tags: ['Philosophy', 'Spirituality', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-16',
      title: 'The Chakra System: Energy Centers',
      summary: 'An introduction to the seven chakras and their role in spiritual and physical well-being.',
      duration: 3150,
      tags: ['Chakras', 'Energy', 'Spirituality'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-17',
      title: 'Satsang: The Power of Spiritual Gathering',
      summary: 'Exploring the tradition of satsang and how spiritual gatherings can deepen practice.',
      duration: 2550,
      tags: ['Community', 'Tradition', 'Spirituality'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-18',
      title: 'Vedanta Philosophy: The End of Knowledge',
      summary: 'An overview of Vedanta philosophy and its core teachings about reality and the self.',
      duration: 3600,
      tags: ['Philosophy', 'Vedanta', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-19',
      title: 'Ahimsa: The Practice of Non-Violence',
      summary: 'Understanding ahimsa as a fundamental principle in yoga and spiritual practice.',
      duration: 2100,
      tags: ['Yoga', 'Ethics', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-20',
      title: 'The Upanishads: Ancient Mystical Texts',
      summary: 'Exploring the Upanishads and their profound insights into the nature of reality.',
      duration: 3300,
      tags: ['Sacred Texts', 'Philosophy', 'Mysticism'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-21',
      title: 'Dhyana: The Practice of Meditation',
      summary: 'Deep dive into dhyana meditation techniques and their transformative effects.',
      duration: 2700,
      tags: ['Meditation', 'Yoga', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-22',
      title: 'Sanskrit: The Language of the Gods',
      summary: 'Understanding the significance of Sanskrit in spiritual texts and practices.',
      duration: 1950,
      tags: ['Language', 'Tradition', 'Education'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-23',
      title: 'The Four Yogas: Paths to Liberation',
      summary: 'Exploring the four main paths of yoga: Karma, Bhakti, Raja, and Jnana Yoga.',
      duration: 3750,
      tags: ['Yoga', 'Philosophy', 'Paths'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-24',
      title: 'Puja: The Art of Worship',
      summary: 'Learning about puja rituals and their role in devotional practice.',
      duration: 1800,
      tags: ['Ritual', 'Devotion', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-25',
      title: 'Maya: The Illusion of Reality',
      summary: 'Understanding the concept of maya and how it relates to spiritual awakening.',
      duration: 3000,
      tags: ['Philosophy', 'Reality', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-26',
      title: 'The Ramayana: Epic of Righteousness',
      summary: 'Exploring the Ramayana and its timeless lessons on dharma and devotion.',
      duration: 4200,
      tags: ['Sacred Texts', 'Epic', 'Dharma'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-27',
      title: 'Sadhana: Daily Spiritual Practice',
      summary: 'Establishing and maintaining a consistent daily spiritual practice.',
      duration: 2250,
      tags: ['Practice', 'Discipline', 'Spirituality'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-28',
      title: 'The Three Gunas: Nature\'s Qualities',
      summary: 'Understanding sattva, rajas, and tamas and their influence on consciousness.',
      duration: 2850,
      tags: ['Philosophy', 'Nature', 'Consciousness'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-29',
      title: 'Japa: The Practice of Repetition',
      summary: 'Learning japa meditation and the power of repetitive prayer and mantra.',
      duration: 2400,
      tags: ['Meditation', 'Mantra', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-30',
      title: 'The Mahabharata: Great Epic of India',
      summary: 'Exploring the Mahabharata and its profound philosophical teachings.',
      duration: 4500,
      tags: ['Sacred Texts', 'Epic', 'Philosophy'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-31',
      title: 'Samadhi: The State of Union',
      summary: 'Understanding samadhi as the ultimate goal of yoga and meditation practice.',
      duration: 2700,
      tags: ['Yoga', 'Meditation', 'Enlightenment'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-32',
      title: 'Prasad: Blessed Food Offering',
      summary: 'The significance of prasad in devotional practice and community.',
      duration: 1650,
      tags: ['Ritual', 'Community', 'Devotion'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-33',
      title: 'Advaita Vedanta: Non-Dual Philosophy',
      summary: 'Exploring Advaita Vedanta and the teaching that all is one.',
      duration: 3450,
      tags: ['Philosophy', 'Vedanta', 'Non-Duality'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-34',
      title: 'The Yoga Sutras: Patanjali\'s Guide',
      summary: 'A study of Patanjali\'s Yoga Sutras and their practical applications.',
      duration: 3600,
      tags: ['Yoga', 'Sacred Texts', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-35',
      title: 'Kirtan: Devotional Singing',
      summary: 'The practice of kirtan and how devotional singing transforms the heart.',
      duration: 2100,
      tags: ['Devotion', 'Music', 'Community'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-36',
      title: 'The Law of Karma: Cause and Effect',
      summary: 'Understanding karma and how our actions shape our spiritual journey.',
      duration: 3000,
      tags: ['Karma', 'Philosophy', 'Ethics'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-37',
      title: 'Darshan: The Blessing of Sight',
      summary: 'The spiritual significance of darshan and seeing the divine.',
      duration: 1950,
      tags: ['Devotion', 'Ritual', 'Spirituality'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-38',
      title: 'The Puranas: Ancient Stories',
      summary: 'Exploring the Puranas and their role in preserving spiritual wisdom.',
      duration: 3300,
      tags: ['Sacred Texts', 'Stories', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-39',
      title: 'Tapas: The Fire of Discipline',
      summary: 'Understanding tapas as the practice of self-discipline and austerity.',
      duration: 2550,
      tags: ['Discipline', 'Practice', 'Yoga'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-40',
      title: 'The Vedas: Ancient Wisdom Texts',
      summary: 'An introduction to the four Vedas and their significance in Hinduism.',
      duration: 3900,
      tags: ['Sacred Texts', 'Vedas', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-41',
      title: 'Bhakti: The Path of Devotion',
      summary: 'Exploring bhakti yoga and the practice of loving devotion to the divine.',
      duration: 3150,
      tags: ['Bhakti', 'Devotion', 'Yoga'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-42',
      title: 'Moksha: Liberation from Suffering',
      summary: 'Understanding moksha as the ultimate goal of spiritual practice.',
      duration: 2850,
      tags: ['Philosophy', 'Liberation', 'Enlightenment'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-43',
      title: 'The Art of Living: Practical Wisdom',
      summary: 'Applying ancient spiritual wisdom to modern daily life challenges.',
      duration: 2400,
      tags: ['Modern Life', 'Wisdom', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-44',
      title: 'Sankirtan: Congregational Chanting',
      summary: 'The practice of sankirtan and its power to transform communities.',
      duration: 2250,
      tags: ['Community', 'Chanting', 'Devotion'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-45',
      title: 'The Trimurti: Three Aspects of God',
      summary: 'Understanding Brahma, Vishnu, and Shiva in Hindu philosophy.',
      duration: 2700,
      tags: ['Philosophy', 'Deities', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-46',
      title: 'Svadhyaya: Self-Study and Reflection',
      summary: 'The practice of svadhyaya and studying sacred texts for self-understanding.',
      duration: 2100,
      tags: ['Study', 'Reflection', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-47',
      title: 'The Gopis: Divine Love Stories',
      summary: 'Exploring the stories of the gopis and their devotion to Krishna.',
      duration: 3000,
      tags: ['Stories', 'Devotion', 'Bhakti'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-48',
      title: 'Ishvara Pranidhana: Surrender to God',
      summary: 'Understanding the practice of surrendering to the divine will.',
      duration: 2550,
      tags: ['Surrender', 'Devotion', 'Yoga'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-49',
      title: 'The Four Ashramas: Stages of Life',
      summary: 'Exploring the traditional four stages of life in Hindu philosophy.',
      duration: 2850,
      tags: ['Philosophy', 'Life Stages', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-50',
      title: 'Prana: The Life Force Energy',
      summary: 'Understanding prana and its role in yoga and spiritual practice.',
      duration: 2250,
      tags: ['Energy', 'Yoga', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-51',
      title: 'The Dashavatara: Ten Incarnations',
      summary: 'Exploring the ten avatars of Vishnu and their significance.',
      duration: 3600,
      tags: ['Stories', 'Deities', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-52',
      title: 'Santosha: Contentment and Peace',
      summary: 'The practice of santosha and finding contentment in all circumstances.',
      duration: 2100,
      tags: ['Contentment', 'Peace', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-53',
      title: 'The Devi: The Divine Feminine',
      summary: 'Understanding the divine feminine principle in Hindu spirituality.',
      duration: 3000,
      tags: ['Deities', 'Feminine', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-54',
      title: 'Vairagya: Detachment and Dispassion',
      summary: 'The practice of vairagya and developing non-attachment to worldly things.',
      duration: 2700,
      tags: ['Detachment', 'Practice', 'Philosophy'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-55',
      title: 'The Panchakarma: Five Actions',
      summary: 'Exploring the five actions of karma and their spiritual implications.',
      duration: 2400,
      tags: ['Karma', 'Philosophy', 'Ethics'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-56',
      title: 'Satsang: Truth in Company',
      summary: 'The importance of spiritual community and gathering with like-minded seekers.',
      duration: 2550,
      tags: ['Community', 'Truth', 'Spirituality'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-57',
      title: 'The Trimurti: Creation, Preservation, Destruction',
      summary: 'Understanding the cosmic functions of the three main deities.',
      duration: 3150,
      tags: ['Philosophy', 'Cosmology', 'Deities'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-58',
      title: 'Brahmacharya: Celibacy and Self-Control',
      summary: 'The practice of brahmacharya and conserving spiritual energy.',
      duration: 2250,
      tags: ['Discipline', 'Self-Control', 'Yoga'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-59',
      title: 'The Nava Rasas: Nine Emotions',
      summary: 'Exploring the nine rasas and their role in art and spirituality.',
      duration: 2700,
      tags: ['Emotions', 'Art', 'Philosophy'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-60',
      title: 'Diksha: Spiritual Initiation',
      summary: 'Understanding diksha and the significance of spiritual initiation.',
      duration: 1950,
      tags: ['Initiation', 'Tradition', 'Spirituality'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-61',
      title: 'The Bhagavata Purana: Stories of Devotion',
      summary: 'Exploring the Bhagavata Purana and its tales of divine love.',
      duration: 4200,
      tags: ['Sacred Texts', 'Stories', 'Devotion'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-62',
      title: 'Aparigraha: Non-Possessiveness',
      summary: 'The practice of aparigraha and letting go of material attachments.',
      duration: 2100,
      tags: ['Non-Attachment', 'Practice', 'Yoga'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-63',
      title: 'The Six Darshanas: Schools of Philosophy',
      summary: 'An overview of the six classical schools of Indian philosophy.',
      duration: 3750,
      tags: ['Philosophy', 'Schools', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-64',
      title: 'Sadhguru: The Inner Teacher',
      summary: 'Understanding the concept of the inner guru and self-realization.',
      duration: 2550,
      tags: ['Guru', 'Self-Realization', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-65',
      title: 'The Yamas: Ethical Restraints',
      summary: 'Exploring the five yamas and their role in yoga practice.',
      duration: 3000,
      tags: ['Yoga', 'Ethics', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-66',
      title: 'The Niyamas: Personal Observances',
      summary: 'Understanding the five niyamas and their spiritual significance.',
      duration: 2850,
      tags: ['Yoga', 'Discipline', 'Practice'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-67',
      title: 'The Mahabharata War: Lessons in Dharma',
      summary: 'Extracting spiritual lessons from the great war in the Mahabharata.',
      duration: 3600,
      tags: ['Epic', 'Dharma', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-68',
      title: 'Prana Vayu: The Five Winds',
      summary: 'Understanding the five prana vayus and their functions in the body.',
      duration: 2400,
      tags: ['Prana', 'Yoga', 'Energy'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-69',
      title: 'The Gayatri Mantra: Universal Prayer',
      summary: 'Exploring the Gayatri Mantra and its profound spiritual significance.',
      duration: 2250,
      tags: ['Mantra', 'Prayer', 'Wisdom'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-70',
      title: 'Sannyasa: The Path of Renunciation',
      summary: 'Understanding sannyasa and the life of a renunciate.',
      duration: 2700,
      tags: ['Renunciation', 'Path', 'Spirituality'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-71',
      title: 'The Ramayana: Journey of Righteousness',
      summary: 'Exploring Rama\'s journey and lessons in dharma and devotion.',
      duration: 3900,
      tags: ['Epic', 'Dharma', 'Devotion'],
      source: 'OtterAI',
    },
    {
      public_id: 'transcript-72',
      title: 'Atman: The True Self',
      summary: 'Understanding atman and the eternal nature of the self.',
      duration: 3000,
      tags: ['Self', 'Philosophy', 'Wisdom'],
      source: 'OtterAI',
    },
  ];

  const itemsPerPage = 6;
  const totalPages = Math.ceil(allMockTranscripts.length / itemsPerPage);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const transcripts = allMockTranscripts.slice(startIndex, endIndex);

  return { transcripts, totalPages };
}

export default function TranscriptsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [transcripts, setTranscripts] = useState<TranscriptItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('grid');
  
  // Get page from URL or default to 1
  const page = parseInt(searchParams.get('p') || '1', 10);

  const updatePage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage === 1) {
      params.delete('p');
    } else {
      params.set('p', newPage.toString());
    }
    router.push(`/transcripts?${params.toString()}`);
  };

  useEffect(() => {
    setLoading(true);
    // Simulate API call delay
    setTimeout(() => {
      const { transcripts: mockTranscripts, totalPages: mockTotalPages } = getMockTranscripts(page);
      setTranscripts(mockTranscripts);
      setTotalPages(mockTotalPages);
      setLoading(false);
    }, 300);
  }, [page]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-background-secondary via-background to-background-secondary">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Transcripts</h1>
            <p className="text-foreground-secondary">Browse and explore all available transcripts</p>
          </div>
          <div className="flex items-center gap-2 bg-background border border-border rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'grid'
                  ? 'bg-primary-600 text-white'
                  : 'text-foreground-secondary hover:bg-background-secondary'
              }`}
              aria-label="Grid view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('row')}
              className={`p-2 rounded transition-colors ${
                viewMode === 'row'
                  ? 'bg-primary-600 text-white'
                  : 'text-foreground-secondary hover:bg-background-secondary'
              }`}
              aria-label="Row view"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {loading ? (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`bg-background rounded-xl border border-border p-6 animate-pulse ${viewMode === 'row' ? 'flex items-center gap-6' : ''}`}>
                <div className="h-6 bg-background-tertiary rounded mb-4"></div>
                <div className="h-4 bg-background-tertiary rounded mb-2"></div>
                <div className="h-4 bg-background-tertiary rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8' : 'space-y-4 mb-8'}>
              {transcripts.map((transcript) => (
                <Link
                  key={transcript.public_id}
                  href={`/transcript/${transcript.public_id}`}
                  className={`bg-background rounded-xl border border-border p-6 hover:shadow-lg hover:border-primary-500 transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'flex flex-col' 
                      : 'flex items-start gap-6'
                  }`}
                >
                  <div className={viewMode === 'row' ? 'flex-1' : 'w-full'}>
                    {/* Title */}
                    <h2 className={`font-bold text-foreground mb-3 ${viewMode === 'grid' ? 'text-xl line-clamp-2' : 'text-2xl'}`}>
                      {transcript.title}
                    </h2>

                    {/* Summary */}
                    {transcript.summary && (
                      <p className={`text-foreground-secondary mb-4 ${viewMode === 'grid' ? 'text-sm line-clamp-3 flex-grow' : 'text-base line-clamp-2'}`}>
                        {transcript.summary}
                      </p>
                    )}
                  </div>

                  {/* Metadata Section */}
                  <div className={`${viewMode === 'grid' ? 'mt-auto space-y-3 pt-4 border-t border-border' : 'flex flex-col items-end gap-2 min-w-[200px]'}`}>
                    {viewMode === 'grid' ? (
                      <>
                        {/* Grid: Duration and Source on same row, aligned left */}
                        <div className="flex items-center gap-2">
                          <div className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                            {formatTime(transcript.duration)}
                          </div>
                          <div className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-full text-xs font-medium">
                            {transcript.source}
                          </div>
                        </div>
                        {/* Tags */}
                        {transcript.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {transcript.tags.map((tag, index) => (
                              <div
                                key={index}
                                className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium"
                              >
                                {tag}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        {/* Row: All items aligned right, each in their own row */}
                        <div className="px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                          {formatTime(transcript.duration)}
                        </div>
                        <div className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded-full text-xs font-medium">
                          {transcript.source}
                        </div>
                        {/* Tags */}
                        {transcript.tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 justify-end">
                            {transcript.tags.map((tag, index) => (
                              <div
                                key={index}
                                className="px-2 py-1 bg-neutral-100 text-foreground-secondary rounded-full text-xs font-medium"
                              >
                                {tag}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button
                onClick={() => updatePage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-background-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {(() => {
                  const pageNumbers = new Set<number>();
                  
                  // Always show first page
                  pageNumbers.add(1);
                  
                  // Show previous page
                  if (page > 1) {
                    pageNumbers.add(page - 1);
                  }
                  
                  // Show current page
                  pageNumbers.add(page);
                  
                  // Show next page
                  if (page < totalPages) {
                    pageNumbers.add(page + 1);
                  }
                  
                  // Always show last page
                  if (totalPages > 1) {
                    pageNumbers.add(totalPages);
                  }
                  
                  // Convert to sorted array
                  const sortedPages = Array.from(pageNumbers).sort((a, b) => a - b);
                  
                  // Build the display array with ellipsis
                  const displayItems: (number | string)[] = [];
                  
                  for (let i = 0; i < sortedPages.length; i++) {
                    const currentPage = sortedPages[i];
                    const nextPage = sortedPages[i + 1];
                    
                    // Add the current page
                    displayItems.push(currentPage);
                    
                    // Add ellipsis if there's a gap
                    if (nextPage && nextPage - currentPage > 1) {
                      displayItems.push('ellipsis');
                    }
                  }
                  
                  return displayItems.map((item, index) => {
                    if (item === 'ellipsis') {
                      return (
                        <span key={`ellipsis-${index}`} className="px-2 text-foreground-tertiary">
                          ...
                        </span>
                      );
                    }
                    const pageNum = item as number;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => updatePage(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                          page === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'text-foreground bg-background border border-border hover:bg-background-secondary'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  });
                })()}
              </div>

              <button
                onClick={() => updatePage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-background-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}


