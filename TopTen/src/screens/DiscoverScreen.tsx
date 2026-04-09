import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useListContext } from '../data/ListContext';
import { FEATURED_LISTS, POPULAR_LISTS, STARTER_LISTS, FeaturedList, PopularList } from '../data/featuredLists';
import { useViewedLists } from '../context/ViewedListsContext';
import { COMMUNITY_LISTS, CommunityList } from '../data/communityLists';
import { fetchFeaturedItems, fetchFeaturedImage, fetchCityImage } from '../services/featuredContentService';
import { CATEGORY_COLORS } from '../components/FeedRow';
import { CATEGORIES } from '../data/categories';
import { EXPLORE_CITIES, ExploreCity } from '../data/exploreCities';
import { colors, spacing, borderRadius, shadow } from '../theme';
import { useAuth } from '../context/AuthContext';
import { FeedPostCard } from '../components/FeedPostCard';
import { useCityFeedPreview } from '../hooks/useCityFeedPreview';
import { getDetectedLocation } from '../services/locationService';
import { fetchLocalPlacesLists } from '../services/googlePlacesService';
import { supabase } from '../services/supabase';
import { FollowButton } from '../components/FollowButton';

interface UserResult {
  id: string;
  username: string | null;
  nickname: string | null;
  avatar_url: string | null;
}

const TEMPLATE_DESCRIPTIONS: Record<string, string> = {
  'Greatest Athletes of All Time': 'The greatest competitors across all sports, ranked by career dominance, legacy, and cultural impact.',
  'Best Restaurants in the World': 'Culinary destinations ranked by Michelin recognition, chef innovation, and world-class dining experience.',
  'Greatest Songs Ever Recorded': 'Songs that defined generations, ranked by cultural impact, chart longevity, and lasting influence.',
  'Most Iconic Movie Villains': 'The most memorable antagonists in cinema, ranked by menace, complexity, and cultural footprint.',
  'Novels That Changed the World': 'Books that shifted perspectives and shaped culture, ranked by literary legacy and enduring relevance.',
  'Classic Cocktails Everyone Should Know': 'The essential cocktail canon, ranked by timelessness, balance, and bartender consensus.',
  'Most Binge-Worthy TV Series': 'The shows you can\'t stop watching, ranked by episode hooks, story arcs, and cultural obsession.',
  'Comfort Foods for Any Occasion': 'Dishes that feel like a warm hug, ranked by universal appeal, simplicity, and pure soul.',
  'Albums You Must Hear Before You Die': 'Records that demand to be heard front to back, ranked by artistry, influence, and staying power.',
  'Most Thrilling Sporting Events Ever': 'The moments that made hearts race worldwide, ranked by stakes, drama, and all-time greatness.',
  'My Favorite Foods': 'Your personal food hall of fame. Add the dishes and flavors you\'d never want to live without.',
  'My Favorite Movies': 'The films that stuck with you. Build your definitive personal ranking.',
  'My Favorite TV Shows': 'The series you\'d watch on repeat. Your personal streaming hall of fame.',
  'My Favorite Animals': 'From beloved pets to wildlife wonders — rank your favorite creatures on the planet.',
  'My Favorite Colors': 'Every palette tells a story. Which colors speak to you most?',
  'My Favorite Songs': 'The tracks that live rent-free in your head. Build your ultimate personal playlist.',
  'My Favorite Sports Teams': 'Your allegiances, ranked. Which teams have your heart through the wins and losses?',
  'My Favorite Drinks': 'From morning coffee to evening cocktails — rank your all-time favorite sips.',
  'My Favorite Cocktails': 'Your personal cocktail hall of fame. Classic or craft — rank the drinks you always come back to.',
  'Best Craft Beers': 'From IPAs to stouts — rank the craft beers that have blown you away.',
  'My Favorite Wines': 'Reds, whites, rosés — rank the bottles you\'d gladly open again and again.',
  'Top Whiskeys I\'ve Tried': 'Single malts, bourbons, blends — rank the whiskeys worth coming back to.',
  'Best Non-Alcoholic Drinks': 'From sparkling water to mocktails — rank your favorite alcohol-free sips.',
  'My Favorite Happy Hour Spots': 'Great drinks, great prices, great vibes. Rank your go-to happy hour haunts.',
  'My Favorite Coffee Shops': 'The spots with the best brews and the best vibes. Your personal café rankings.',
  'Best Coffee Brands': 'From beans to pods — rank the coffee brands you actually trust in your cup.',
  'Favorite Coffee Drinks': 'Espresso, cold brew, cortado — rank your go-to coffee orders.',
  'Best Cold Brew Brands': 'Smooth, strong, and ready to drink — rank the cold brews worth buying again.',
  'Best Pour-Over Coffees': 'For when brewing is part of the ritual. Rank your favorite pour-over beans.',
  'My Morning Coffee Routine': 'How you start the day matters. Rank the steps, drinks, and rituals that make your morning.',
  'My Favorite Dinner Recipes': 'The meals you keep coming back to. Rank the dinner recipes in your regular rotation.',
  'Best Comfort Food Recipes': 'The dishes that feel like a warm hug. Rank your all-time comfort food go-tos.',
  'Quick Weeknight Dinners': 'Fast, satisfying, and actually good. Rank your best weeknight dinner solutions.',
  'Best Breakfast Recipes': 'From pancakes to shakshuka — rank the breakfast dishes worth waking up for.',
  'Weekend Brunch Favorites': 'Lazy mornings done right. Rank the brunch dishes and spots you love most.',
  'My Favorite Snacks': 'The snacks you always come back to. Rank your all-time pantry favorites.',
  'My Dream Destinations': 'The places you\'ve always wanted to go. Rank your ultimate travel bucket list.',
  'Cities I Want to Visit': 'From world capitals to hidden gems — rank the cities on your must-see list.',
  "Best Road Trips I've Taken": 'Miles of great scenery and memories. Rank the road trips that stick with you.',
  'Favorite Hotels I\'ve Stayed': 'From boutique gems to grand classics — rank the hotels that impressed you most.',
  'Best Beach Destinations': 'Sun, sand, and perfect water. Rank the beaches and beach towns worth the trip.',
  'Hidden Gem Cities': 'The underrated places most people overlook. Rank the cities that surprised you.',
  'My Pump-Up Playlist': 'The songs that get you fired up. Rank the tracks you blast when you need energy.',
  'Rainy Day Albums': 'Perfect for a grey afternoon. Rank the albums that hit best when it\'s raining outside.',
  'My Karaoke Go-Tos': 'The songs you own every time. Rank your signature karaoke tracks.',
  'Songs That Define My Childhood': 'The tracks that take you right back. Rank the songs that shaped who you are.',
  'My Late Night Drive Playlist': 'Windows down, city lights. Rank the songs built for late-night drives.',
  'Best Albums of the Last Decade': 'The records that defined the 2010s and 2020s. Rank the ones that mattered most.',
  'My Favorite Athletes Ever': 'The greatest competitors you\'ve watched. Rank the athletes who inspire you most.',
  'Greatest Sports Moments': 'The plays, games, and moments that made your jaw drop. Rank them.',
  'My Dream All-Star Team': 'Pick the best of the best. Rank the players you\'d build your dream squad around.',
  'Best Sports Movies': 'The films that capture the thrill of competition. Rank the sports movies that actually hold up.',
  'Most Iconic Sports Rivalries': 'The matchups that defined eras. Rank the rivalries that made sports worth watching.',
  'Greatest Coaches of All Time': 'The masterminds behind the wins. Rank the coaches who changed the game.',
  // Movies
  'My All-Time Favorite Movies': 'The films that stuck with you forever. Build your definitive personal ranking.',
  'Best Movies of the Last Decade': 'The standout films from 2015 onward. Rank the ones that actually hold up.',
  'Movies I Could Watch on Repeat': 'The films you never get tired of. Rank your all-time rewatches.',
  'My Favorite Movie Directors': 'The visionaries behind your favorite films. Rank the directors you trust most.',
  'Best Movie Soundtracks': 'The scores and songs that elevated the film. Rank the soundtracks you still listen to.',
  'Most Underrated Movies Ever': 'The gems most people slept on. Rank the films that deserved way more attention.',
  // TV
  'My Favorite TV Shows Ever': 'The series that earned every hour you gave them. Build your all-time rankings.',
  'Best Shows to Binge Right Now': 'Can\'t-stop-watching TV. Rank the series worth clearing your weekend for.',
  'Shows I Keep Rewatching': 'The TV you return to again and again. Rank the shows that never get old.',
  'Most Underrated TV Shows': 'The series that flew under the radar. Rank the shows more people should know about.',
  'Best Reality TV Shows': 'From competition to chaos — rank the reality shows actually worth watching.',
  'My Favorite TV Characters Ever': 'The characters that felt real. Rank the TV personalities who stuck with you.',
  // Books
  'Books That Changed My Life': 'The reads that shifted how you think. Rank the books that genuinely changed you.',
  'My Favorite Authors': 'The writers you\'d read anything by. Rank the authors who never disappoint.',
  'Best Beach Reads': 'Easy, engaging, and impossible to put down. Rank your favorite page-turners.',
  'Most Underrated Books': 'The books that deserved more buzz. Rank the underappreciated titles worth reading.',
  'Books on My Reading List': 'The stack you haven\'t gotten to yet. Rank the books you\'re most excited to read.',
  'Best Book Series Ever': 'The multi-book worlds worth committing to. Rank the series that kept you hooked.',
  // Gaming
  'My All-Time Favorite Games': 'The titles you\'d play again from the start. Rank your all-time gaming greats.',
  'Best Game Franchises Ever': 'The series that defined gaming. Rank the franchises that consistently delivered.',
  'Childhood Games I Still Love': 'The games that shaped your taste. Rank the childhood titles you\'d play today.',
  'Best Co-Op Games': 'Better with friends. Rank the games that made multiplayer worth it.',
  'Most Iconic Video Game Moments': 'The scenes, reveals, and boss fights you\'ll never forget. Rank them.',
  'Best Game Soundtracks': 'Music that made the game. Rank the soundtracks you still listen to outside of gaming.',
  // Health & Fitness
  'My Favorite Workouts': 'The sessions you actually look forward to. Rank your go-to ways to move.',
  'My Wellness Non-Negotiables': 'The habits that keep you feeling good. Rank the routines you won\'t skip.',
  'Best Healthy Meal Preps': 'Nutritious and actually tasty. Rank your favorite meals to batch cook.',
  'Favorite Fitness Apps': 'The apps that keep you consistent. Rank the fitness tools you rely on most.',
  "Best Running Routes I've Done": 'Scenic, challenging, or just perfect. Rank the running routes worth lacing up for.',
  "Gyms I've Loved": 'The spots where you actually show up. Rank the gyms that earned your loyalty.',
  // Tech
  'My Favorite Apps': 'The apps you reach for every day. Rank the tools you couldn\'t live without.',
  'Best Productivity Tools': 'Work smarter, not harder. Rank the tools that actually moved the needle.',
  'My Favorite Tech Gadgets': 'The devices that earned their spot. Rank the tech you actually use.',
  'Apps I Use Every Day': 'Your daily digital stack. Rank the apps that are open before 9am.',
  'Best Smart Home Devices': 'Your home, upgraded. Rank the smart home products worth the investment.',
  'Most Influential Tech Products': 'The devices and software that changed everything. Rank the most impactful tech ever made.',
  // Outdoors
  "Best Hikes I've Done": 'The trails that were worth every step. Rank the hikes you\'d do again.',
  'My Favorite National Parks': 'America\'s best idea. Rank the parks that took your breath away.',
  "Best Camping Spots I've Tried": 'Under the stars, done right. Rank the campsites you\'d return to.',
  "Most Beautiful Places I've Seen": 'The views that stopped you cold. Rank the most stunning places you\'ve been.',
  'Best Scenic Drives': 'Windows down, no destination. Rank the drives that made the journey the point.',
  'Favorite Outdoor Activities': 'From kayaking to climbing — rank the outdoor pursuits you love most.',
  // People
  'Most Inspiring People of Our Time': 'The individuals whose work and lives move you. Rank the most inspiring figures alive.',
  'My Favorite Podcasters': 'The voices you trust in your ears. Rank the podcasters you never miss.',
  'Best Comedians Ever': 'The ones who made you cry-laugh. Rank the comedians who defined the craft.',
  'People Who Changed My Life': 'Teachers, mentors, friends — rank the people who shaped who you are.',
  'Most Influential Leaders Ever': 'The figures who moved history. Rank the leaders whose impact still echoes.',
  'Favorite Public Figures I Follow': 'The thinkers, creators, and voices you actually pay attention to. Rank them.',
};

interface NicheCategory {
  id: string;
  label: string;
  icon: string;
  color: string;
  ideas: PopularList[];
}

const NICHE_CATEGORIES: NicheCategory[] = [
  {
    id: 'niche-drinks',
    label: 'Drinks',
    icon: 'wine-outline',
    color: CATEGORY_COLORS.Drinks,
    ideas: [
      { id: 'n-d1', title: 'My Favorite Cocktails',        category: 'Drinks', icon: 'wine-outline', color: CATEGORY_COLORS.Drinks },
      { id: 'n-d2', title: 'Best Craft Beers',             category: 'Drinks', icon: 'beer-outline', color: CATEGORY_COLORS.Drinks },
      { id: 'n-d3', title: 'My Favorite Wines',            category: 'Drinks', icon: 'wine-outline', color: CATEGORY_COLORS.Drinks },
      { id: 'n-d4', title: "Top Whiskeys I've Tried",      category: 'Drinks', icon: 'wine-outline', color: CATEGORY_COLORS.Drinks },
      { id: 'n-d5', title: 'Best Non-Alcoholic Drinks',    category: 'Drinks', icon: 'wine-outline', color: CATEGORY_COLORS.Drinks },
      { id: 'n-d6', title: 'My Favorite Happy Hour Spots', category: 'Drinks', icon: 'wine-outline', color: CATEGORY_COLORS.Drinks },
    ],
  },
  {
    id: 'niche-coffee',
    label: 'Coffee',
    icon: 'cafe-outline',
    color: '#6B4226',
    ideas: [
      { id: 'n-c1', title: 'My Favorite Coffee Shops', category: 'Food',   icon: 'cafe-outline', color: '#6B4226' },
      { id: 'n-c2', title: 'Best Coffee Brands',       category: 'Drinks', icon: 'cafe-outline', color: '#6B4226' },
      { id: 'n-c3', title: 'Favorite Coffee Drinks',   category: 'Drinks', icon: 'cafe-outline', color: '#6B4226' },
      { id: 'n-c4', title: 'Best Cold Brew Brands',    category: 'Drinks', icon: 'cafe-outline', color: '#6B4226' },
      { id: 'n-c5', title: 'Best Pour-Over Coffees',   category: 'Drinks', icon: 'cafe-outline', color: '#6B4226' },
      { id: 'n-c6', title: 'My Morning Coffee Routine',category: 'Miscellaneous', icon: 'cafe-outline', color: '#6B4226' },
    ],
  },
  {
    id: 'niche-recipes',
    label: 'Recipes',
    icon: 'flame-outline',
    color: CATEGORY_COLORS.Food,
    ideas: [
      { id: 'n-r1', title: 'My Favorite Dinner Recipes', category: 'Food', icon: 'flame-outline', color: CATEGORY_COLORS.Food },
      { id: 'n-r2', title: 'Best Comfort Food Recipes',  category: 'Food', icon: 'flame-outline', color: CATEGORY_COLORS.Food },
      { id: 'n-r3', title: 'Quick Weeknight Dinners',    category: 'Food', icon: 'flame-outline', color: CATEGORY_COLORS.Food },
      { id: 'n-r4', title: 'Best Breakfast Recipes',     category: 'Food', icon: 'flame-outline', color: CATEGORY_COLORS.Food },
      { id: 'n-r5', title: 'Weekend Brunch Favorites',   category: 'Food', icon: 'flame-outline', color: CATEGORY_COLORS.Food },
      { id: 'n-r6', title: 'My Favorite Snacks',         category: 'Food', icon: 'flame-outline', color: CATEGORY_COLORS.Food },
    ],
  },
  {
    id: 'niche-travel',
    label: 'Travel',
    icon: 'airplane-outline',
    color: CATEGORY_COLORS.Travel,
    ideas: [
      { id: 'n-t1', title: 'My Dream Destinations',       category: 'Travel', icon: 'airplane-outline', color: CATEGORY_COLORS.Travel },
      { id: 'n-t2', title: 'Cities I Want to Visit',      category: 'Travel', icon: 'airplane-outline', color: CATEGORY_COLORS.Travel },
      { id: 'n-t3', title: "Best Road Trips I've Taken",  category: 'Travel', icon: 'airplane-outline', color: CATEGORY_COLORS.Travel },
      { id: 'n-t4', title: "Favorite Hotels I've Stayed", category: 'Travel', icon: 'airplane-outline', color: CATEGORY_COLORS.Travel },
      { id: 'n-t5', title: 'Best Beach Destinations',     category: 'Travel', icon: 'airplane-outline', color: CATEGORY_COLORS.Travel },
      { id: 'n-t6', title: 'Hidden Gem Cities',           category: 'Travel', icon: 'airplane-outline', color: CATEGORY_COLORS.Travel },
    ],
  },
  {
    id: 'niche-music',
    label: 'Music',
    icon: 'headset-outline',
    color: CATEGORY_COLORS.Music,
    ideas: [
      { id: 'n-m1', title: 'My Pump-Up Playlist',          category: 'Music', icon: 'musical-notes-outline', color: CATEGORY_COLORS.Music },
      { id: 'n-m2', title: 'Rainy Day Albums',             category: 'Music', icon: 'musical-notes-outline', color: CATEGORY_COLORS.Music },
      { id: 'n-m3', title: 'My Karaoke Go-Tos',           category: 'Music', icon: 'mic-outline',            color: CATEGORY_COLORS.Music },
      { id: 'n-m4', title: 'Songs That Define My Childhood', category: 'Music', icon: 'musical-notes-outline', color: CATEGORY_COLORS.Music },
      { id: 'n-m5', title: 'My Late Night Drive Playlist', category: 'Music', icon: 'musical-notes-outline', color: CATEGORY_COLORS.Music },
      { id: 'n-m6', title: 'Best Albums of the Last Decade', category: 'Music', icon: 'musical-notes-outline', color: CATEGORY_COLORS.Music },
    ],
  },
  {
    id: 'niche-sports',
    label: 'Sports',
    icon: 'trophy-outline',
    color: CATEGORY_COLORS.Sports,
    ideas: [
      { id: 'n-s1', title: 'My Favorite Athletes Ever',     category: 'Sports', icon: 'trophy-outline', color: CATEGORY_COLORS.Sports },
      { id: 'n-s2', title: 'Greatest Sports Moments',       category: 'Sports', icon: 'trophy-outline', color: CATEGORY_COLORS.Sports },
      { id: 'n-s3', title: 'My Dream All-Star Team',        category: 'Sports', icon: 'trophy-outline', color: CATEGORY_COLORS.Sports },
      { id: 'n-s4', title: 'Best Sports Movies',            category: 'Movies', icon: 'trophy-outline', color: CATEGORY_COLORS.Sports },
      { id: 'n-s5', title: 'Most Iconic Sports Rivalries',  category: 'Sports', icon: 'trophy-outline', color: CATEGORY_COLORS.Sports },
      { id: 'n-s6', title: 'Greatest Coaches of All Time',  category: 'Sports', icon: 'trophy-outline', color: CATEGORY_COLORS.Sports },
    ],
  },
  {
    id: 'niche-movies',
    label: 'Movies',
    icon: 'film-outline',
    color: CATEGORY_COLORS.Movies,
    ideas: [
      { id: 'n-mv1', title: 'My All-Time Favorite Movies',    category: 'Movies', icon: 'film-outline', color: CATEGORY_COLORS.Movies },
      { id: 'n-mv2', title: 'Best Movies of the Last Decade', category: 'Movies', icon: 'film-outline', color: CATEGORY_COLORS.Movies },
      { id: 'n-mv3', title: 'Movies I Could Watch on Repeat', category: 'Movies', icon: 'film-outline', color: CATEGORY_COLORS.Movies },
      { id: 'n-mv4', title: 'My Favorite Movie Directors',    category: 'Movies', icon: 'film-outline', color: CATEGORY_COLORS.Movies },
      { id: 'n-mv5', title: 'Best Movie Soundtracks',         category: 'Movies', icon: 'film-outline', color: CATEGORY_COLORS.Movies },
      { id: 'n-mv6', title: 'Most Underrated Movies Ever',    category: 'Movies', icon: 'film-outline', color: CATEGORY_COLORS.Movies },
    ],
  },
  {
    id: 'niche-tv',
    label: 'TV',
    icon: 'tv-outline',
    color: CATEGORY_COLORS.TV,
    ideas: [
      { id: 'n-tv1', title: 'My Favorite TV Shows Ever',      category: 'TV', icon: 'tv-outline', color: CATEGORY_COLORS.TV },
      { id: 'n-tv2', title: 'Best Shows to Binge Right Now',  category: 'TV', icon: 'tv-outline', color: CATEGORY_COLORS.TV },
      { id: 'n-tv3', title: 'Shows I Keep Rewatching',        category: 'TV', icon: 'tv-outline', color: CATEGORY_COLORS.TV },
      { id: 'n-tv4', title: 'Most Underrated TV Shows',       category: 'TV', icon: 'tv-outline', color: CATEGORY_COLORS.TV },
      { id: 'n-tv5', title: 'Best Reality TV Shows',          category: 'TV', icon: 'tv-outline', color: CATEGORY_COLORS.TV },
      { id: 'n-tv6', title: 'My Favorite TV Characters Ever', category: 'TV', icon: 'tv-outline', color: CATEGORY_COLORS.TV },
    ],
  },
  {
    id: 'niche-books',
    label: 'Books',
    icon: 'book-outline',
    color: CATEGORY_COLORS.Books,
    ideas: [
      { id: 'n-bk1', title: 'Books That Changed My Life',   category: 'Books', icon: 'book-outline', color: CATEGORY_COLORS.Books },
      { id: 'n-bk2', title: 'My Favorite Authors',          category: 'Books', icon: 'book-outline', color: CATEGORY_COLORS.Books },
      { id: 'n-bk3', title: 'Best Beach Reads',             category: 'Books', icon: 'book-outline', color: CATEGORY_COLORS.Books },
      { id: 'n-bk4', title: 'Most Underrated Books',        category: 'Books', icon: 'book-outline', color: CATEGORY_COLORS.Books },
      { id: 'n-bk5', title: 'Books on My Reading List',     category: 'Books', icon: 'book-outline', color: CATEGORY_COLORS.Books },
      { id: 'n-bk6', title: 'Best Book Series Ever',        category: 'Books', icon: 'book-outline', color: CATEGORY_COLORS.Books },
    ],
  },
  {
    id: 'niche-gaming',
    label: 'Gaming',
    icon: 'game-controller-outline',
    color: CATEGORY_COLORS.Gaming,
    ideas: [
      { id: 'n-g1', title: 'My All-Time Favorite Games',       category: 'Gaming', icon: 'game-controller-outline', color: CATEGORY_COLORS.Gaming },
      { id: 'n-g2', title: 'Best Game Franchises Ever',        category: 'Gaming', icon: 'game-controller-outline', color: CATEGORY_COLORS.Gaming },
      { id: 'n-g3', title: 'Childhood Games I Still Love',     category: 'Gaming', icon: 'game-controller-outline', color: CATEGORY_COLORS.Gaming },
      { id: 'n-g4', title: 'Best Co-Op Games',                 category: 'Gaming', icon: 'game-controller-outline', color: CATEGORY_COLORS.Gaming },
      { id: 'n-g5', title: 'Most Iconic Video Game Moments',   category: 'Gaming', icon: 'game-controller-outline', color: CATEGORY_COLORS.Gaming },
      { id: 'n-g6', title: 'Best Game Soundtracks',            category: 'Gaming', icon: 'game-controller-outline', color: CATEGORY_COLORS.Gaming },
    ],
  },
  {
    id: 'niche-health',
    label: 'Health & Fitness',
    icon: 'fitness-outline',
    color: CATEGORY_COLORS.Health,
    ideas: [
      { id: 'n-h1', title: 'My Favorite Workouts',            category: 'Health', icon: 'fitness-outline', color: CATEGORY_COLORS.Health },
      { id: 'n-h2', title: 'My Wellness Non-Negotiables',     category: 'Health', icon: 'fitness-outline', color: CATEGORY_COLORS.Health },
      { id: 'n-h3', title: 'Best Healthy Meal Preps',         category: 'Health', icon: 'fitness-outline', color: CATEGORY_COLORS.Health },
      { id: 'n-h4', title: 'Favorite Fitness Apps',           category: 'Health', icon: 'fitness-outline', color: CATEGORY_COLORS.Health },
      { id: 'n-h5', title: 'Best Running Routes I\'ve Done',  category: 'Health', icon: 'fitness-outline', color: CATEGORY_COLORS.Health },
      { id: 'n-h6', title: 'Gyms I\'ve Loved',               category: 'Health', icon: 'fitness-outline', color: CATEGORY_COLORS.Health },
    ],
  },
  {
    id: 'niche-tech',
    label: 'Tech',
    icon: 'laptop-outline',
    color: CATEGORY_COLORS.Tech,
    ideas: [
      { id: 'n-tc1', title: 'My Favorite Apps',             category: 'Tech', icon: 'laptop-outline', color: CATEGORY_COLORS.Tech },
      { id: 'n-tc2', title: 'Best Productivity Tools',      category: 'Tech', icon: 'laptop-outline', color: CATEGORY_COLORS.Tech },
      { id: 'n-tc3', title: 'My Favorite Tech Gadgets',     category: 'Tech', icon: 'laptop-outline', color: CATEGORY_COLORS.Tech },
      { id: 'n-tc4', title: 'Apps I Use Every Day',         category: 'Tech', icon: 'laptop-outline', color: CATEGORY_COLORS.Tech },
      { id: 'n-tc5', title: 'Best Smart Home Devices',      category: 'Tech', icon: 'laptop-outline', color: CATEGORY_COLORS.Tech },
      { id: 'n-tc6', title: 'Most Influential Tech Products', category: 'Tech', icon: 'laptop-outline', color: CATEGORY_COLORS.Tech },
    ],
  },
  {
    id: 'niche-outdoors',
    label: 'Outdoors',
    icon: 'leaf-outline',
    color: CATEGORY_COLORS.Nature,
    ideas: [
      { id: 'n-o1', title: 'Best Hikes I\'ve Done',          category: 'Nature', icon: 'leaf-outline', color: CATEGORY_COLORS.Nature },
      { id: 'n-o2', title: 'My Favorite National Parks',     category: 'Nature', icon: 'leaf-outline', color: CATEGORY_COLORS.Nature },
      { id: 'n-o3', title: 'Best Camping Spots I\'ve Tried', category: 'Nature', icon: 'leaf-outline', color: CATEGORY_COLORS.Nature },
      { id: 'n-o4', title: 'Most Beautiful Places I\'ve Seen', category: 'Nature', icon: 'leaf-outline', color: CATEGORY_COLORS.Nature },
      { id: 'n-o5', title: 'Best Scenic Drives',             category: 'Nature', icon: 'leaf-outline', color: CATEGORY_COLORS.Nature },
      { id: 'n-o6', title: 'Favorite Outdoor Activities',    category: 'Nature', icon: 'leaf-outline', color: CATEGORY_COLORS.Nature },
    ],
  },
  {
    id: 'niche-people',
    label: 'People',
    icon: 'people-outline',
    color: CATEGORY_COLORS.People,
    ideas: [
      { id: 'n-p1', title: 'Most Inspiring People of Our Time', category: 'People', icon: 'people-outline', color: CATEGORY_COLORS.People },
      { id: 'n-p2', title: 'My Favorite Podcasters',            category: 'People', icon: 'people-outline', color: CATEGORY_COLORS.People },
      { id: 'n-p3', title: 'Best Comedians Ever',               category: 'People', icon: 'people-outline', color: CATEGORY_COLORS.People },
      { id: 'n-p4', title: 'People Who Changed My Life',        category: 'People', icon: 'people-outline', color: CATEGORY_COLORS.People },
      { id: 'n-p5', title: 'Most Influential Leaders Ever',     category: 'People', icon: 'people-outline', color: CATEGORY_COLORS.People },
      { id: 'n-p6', title: 'Favorite Public Figures I Follow',  category: 'People', icon: 'people-outline', color: CATEGORY_COLORS.People },
    ],
  },
];

export const DiscoverScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { lists, addList } = useListContext();
  const [discoverCity, setDiscoverCity] = useState<{ name: string; slug: string } | null>(null);
  const [discoverFeedRefreshKey, setDiscoverFeedRefreshKey] = useState(0);
  const [localLists, setLocalLists] = useState<CommunityList[]>([]);

  useEffect(() => {
    getDetectedLocation().then((loc) => {
      if (loc?.city) {
        const slug = loc.city.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
        setDiscoverCity({ name: loc.city, slug });
        fetchLocalPlacesLists(loc.city).then(setLocalLists).catch(() => {});
      }
    });
  }, []);

  // Retry feed once auth resolves — handles cold-start race where initial
  // Supabase query fires before the session is established.
  useEffect(() => {
    if (!user) return;
    setDiscoverFeedRefreshKey(k => k + 1);
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const existingTitles = useMemo(() => new Set(lists.map(l => l.title)), [lists]);
  const anyNicheIdeasLeft = useMemo(() =>
    NICHE_CATEGORIES.some(niche => niche.ideas.some(idea => !existingTitles.has(idea.title))),
    [existingTitles]
  );

  const handlePopularPress = useCallback((item: PopularList) => {
    // Trending Lists have a featuredId — navigate to the curated Featured List
    if (item.featuredId) {
      navigation.navigate('FeaturedList', { featuredId: item.featuredId });
      return;
    }
    // Common Lists (STARTER_LISTS) create personal lists — require auth
    if (!user) {
      navigation.navigate('AuthScreen');
      return;
    }
    const existing = lists.find(l => l.title === item.title);
    const listId = existing ? existing.id : addList(item.category, item.title, TEMPLATE_DESCRIPTIONS[item.title]);
    navigation.navigate('ListDetail', { listId });
  }, [user, lists, addList, navigation]);

  const [query, setQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'lists' | 'people'>('lists');
  const [launchCategory, setLaunchCategory] = useState<typeof CATEGORIES[0] | null>(null);
  const [peopleResults, setPeopleResults] = useState<UserResult[]>([]);
  const peopleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { viewedIds } = useViewedLists();
  const { posts: discoverFeedPosts, loading: discoverFeedLoading } = useCityFeedPreview(discoverCity?.slug ?? null, discoverFeedRefreshKey);

  // People search — debounced, fires when query >= 2 chars
  useEffect(() => {
    if (peopleTimer.current) clearTimeout(peopleTimer.current);
    const term = query.trim();
    if (term.length < 2) { setPeopleResults([]); return; }
    peopleTimer.current = setTimeout(async () => {
      if (!supabase) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('id, username, nickname, avatar_url')
        .or(`username.ilike.%${term}%,nickname.ilike.%${term}%`)
        .limit(5);
      setPeopleResults(data ?? []);
    }, 300);
    return () => { if (peopleTimer.current) clearTimeout(peopleTimer.current); };
  }, [query]);

  const q = query.toLowerCase().trim();

  const filteredFeatured = useMemo(() => {
    const base = q
      ? FEATURED_LISTS.filter(l => l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q))
      : FEATURED_LISTS;
    if (q) return base; // don't reorder search results
    const unreviewed = base.filter(l => !viewedIds.has(l.id));
    const reviewed = base.filter(l => viewedIds.has(l.id));
    return [...unreviewed, ...reviewed];
  }, [q, viewedIds]);

  const filteredCommunity = useMemo(() =>
    q ? COMMUNITY_LISTS.filter(l =>
      l.title.toLowerCase().includes(q) || l.category.toLowerCase().includes(q)
    ) : [],
    [q]
  );

  type SearchItem =
    | { kind: 'featured'; data: FeaturedList }
    | { kind: 'community'; data: CommunityList };

  const searchResults = useMemo((): SearchItem[] => [
    ...filteredFeatured.map(d => ({ kind: 'featured' as const, data: d })),
    ...filteredCommunity.map(d => ({ kind: 'community' as const, data: d })),
  ], [filteredFeatured, filteredCommunity]);

  const isSearching = q.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image source={require('../../assets/logo.png')} style={styles.logoIcon} />
          <Text style={styles.headerTitle}>Discover</Text>
        </View>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.secondaryText} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={(t) => { setQuery(t); if (t.length === 0) setSearchScope('lists'); }}
            placeholder="Search lists or people…"
            placeholderTextColor={colors.secondaryText}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); setSearchScope('lists'); }}>
              <Ionicons name="close-circle" size={16} color={colors.secondaryText} />
            </TouchableOpacity>
          )}
        </View>
        {query.length > 0 && (
          <View style={styles.scopeRow}>
            <TouchableOpacity
              style={[styles.scopePill, searchScope === 'lists' && styles.scopePillActive]}
              onPress={() => setSearchScope('lists')}
              activeOpacity={0.7}
            >
              <Text style={[styles.scopePillText, searchScope === 'lists' && styles.scopePillTextActive]}>Lists</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scopePill, searchScope === 'people' && styles.scopePillActive]}
              onPress={() => setSearchScope('people')}
              activeOpacity={0.7}
            >
              <Text style={[styles.scopePillText, searchScope === 'people' && styles.scopePillTextActive]}>People</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {isSearching ? (
        searchScope === 'people' ? (
          /* ── People results ── */
          <FlatList
            data={peopleResults}
            keyExtractor={(u) => u.id}
            contentContainerStyle={styles.searchResults}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            ItemSeparatorComponent={() => <View style={styles.peopleDivider} />}
            ListEmptyComponent={
              q.length >= 2 ? (
                <View style={styles.empty}>
                  <Ionicons name="people-outline" size={40} color={colors.secondaryText} />
                  <Text style={styles.emptyText}>No people matching "{query}"</Text>
                </View>
              ) : (
                <View style={styles.empty}>
                  <Ionicons name="people-outline" size={40} color={colors.border} />
                  <Text style={styles.emptyText}>Type to search for people</Text>
                </View>
              )
            }
            renderItem={({ item: u }) => {
              const displayName = u.nickname ?? (u.username ? `@${u.username}` : 'Unknown');
              const username = u.username ? `@${u.username}` : null;
              return (
                <View style={styles.peopleRow}>
                  <TouchableOpacity
                    style={styles.peopleRowLeft}
                    onPress={() => navigation.navigate('UserProfile', { userId: u.id })}
                    activeOpacity={0.8}
                  >
                    {u.avatar_url ? (
                      <Image source={{ uri: u.avatar_url }} style={styles.peopleAvatar} />
                    ) : (
                      <View style={[styles.peopleAvatar, styles.peopleAvatarFallback]}>
                        <Ionicons name="person" size={18} color={colors.secondaryText} />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.peopleDisplayName} numberOfLines={1}>{displayName}</Text>
                      {username && u.nickname ? (
                        <Text style={styles.peopleUsername}>{username}</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                  <FollowButton targetUserId={u.id} />
                </View>
              );
            }}
          />
        ) : (
          /* ── List results: featured + community ── */
          <FlatList
            data={searchResults}
            keyExtractor={(item) => `${item.kind}-${item.data.id}`}
            contentContainerStyle={styles.searchResults}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="on-drag"
            ListEmptyComponent={
              <View style={styles.empty}>
                <Ionicons name="search-outline" size={40} color={colors.secondaryText} />
                <Text style={styles.emptyText}>No lists matching "{query}"</Text>
              </View>
            }
            renderItem={({ item }) =>
              item.kind === 'featured' ? (
                <FeaturedRow
                  list={item.data}
                  onPress={() => navigation.navigate('FeaturedList', { featuredId: item.data.id })}
                />
              ) : (
                <CommunitySearchRow
                  list={item.data}
                  onPress={() => navigation.navigate('CommunityList', { communityListId: item.data.id })}
                />
              )
            }
          />
        )
      ) : (
        /* ── Default browse view ── */
        <ScrollView showsVerticalScrollIndicator={false} keyboardDismissMode="on-drag" contentContainerStyle={styles.browse}>
          {/* Explore Other Areas */}
          <TouchableOpacity
            style={styles.sectionHeaderLink}
            onPress={() => navigation.navigate('ExploreAreas')}
            activeOpacity={0.6}
          >
            <Text style={styles.sectionHeaderInline}>Explore Other Areas</Text>
            <Ionicons name="chevron-forward" size={22} color={colors.secondaryText} />
          </TouchableOpacity>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {EXPLORE_CITIES.map((city) => (
              <CityCarouselCard
                key={city.id}
                city={city}
                onPress={() => navigation.navigate('CityLists', { city: city.name })}
              />
            ))}
          </ScrollView>

          {/* List Ideas — niche category idea cards */}
          {anyNicheIdeasLeft && (
            <>
              <Text style={styles.sectionHeader}>List Ideas</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.carousel}
              >
                {NICHE_CATEGORIES.map((niche) => {
                  const remaining = niche.ideas
                    .filter(idea => !existingTitles.has(idea.title))
                    .slice(0, 3);
                  if (remaining.length === 0) return null;
                  return (
                    <NicheCategoryCard
                      key={niche.id}
                      niche={{ ...niche, ideas: remaining }}
                      onIdeaPress={handlePopularPress}
                    />
                  );
                })}
              </ScrollView>
            </>
          )}

          {/* Local Feed teaser — any city */}
          {discoverCity && (
            <>
              <View style={styles.sectionHeaderRow}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => navigation.navigate('CommunityFeed', {
                    citySlug: discoverCity.slug,
                    cityName: discoverCity.name,
                  })}
                  activeOpacity={0.6}
                >
                  <Text style={styles.sectionHeaderInline}>Local Feed</Text>
                  <Ionicons name="chevron-forward" size={20} color={colors.secondaryText} />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="location-sharp" size={13} color={colors.secondaryText} />
                  <Text style={{ fontSize: 13, fontWeight: '500', color: colors.secondaryText }}>{discoverCity.name}</Text>
                </View>
              </View>
              {discoverFeedPosts.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.carousel}
                >
                  {discoverFeedPosts.slice(0, 5).map((post) => (
                    <FeedPostCard
                      key={post.id}
                      post={post}
                      compact
                      onPress={() => navigation.navigate('PublishedList', { postId: post.id })}
                    />
                  ))}
                </ScrollView>
              ) : !discoverFeedLoading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 12 }}>
                  <Ionicons name="megaphone-outline" size={22} color={colors.border} />
                  <View>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.primaryText, marginBottom: 2 }}>
                      Be the first to post in {discoverCity.name}!
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.secondaryText }}>
                      Open any list → tap Post to Local Feed
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
          )}

          {/* Common Starter Lists */}
          <Text style={styles.sectionHeader}>Common Starter Lists</Text>
          <View style={styles.popularCard}>
            {STARTER_LISTS.slice(0, 10).map((list, index, arr) => (
              <React.Fragment key={list.id}>
                <PopularRow list={list} onPress={() => handlePopularPress(list)} />
                {index < arr.length - 1 && <View style={styles.popularDivider} />}
              </React.Fragment>
            ))}
          </View>

          {/* Browse by Category */}
          <Text style={styles.sectionHeader}>Browse by Category</Text>
          <View style={styles.categoryGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.label}
                style={styles.categoryGridItem}
                onPress={() => setLaunchCategory(cat)}
                activeOpacity={0.7}
              >
                <View style={[styles.categoryGridIcon, { backgroundColor: cat.color + '22' }]}>
                  <Ionicons name={cat.icon as any} size={22} color={cat.color} />
                </View>
                <Text style={styles.categoryGridLabel} numberOfLines={1}>{cat.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      )}

      {/* Category Launch Sheet */}
      <CategoryLaunchSheet
        category={launchCategory}
        discoverCity={discoverCity}
        onClose={() => setLaunchCategory(null)}
        onTopX={() => {
          setLaunchCategory(null);
          navigation.navigate('AllCommunityLists', { initialCategory: launchCategory!.label });
        }}
        onInYourArea={() => {
          setLaunchCategory(null);
          navigation.navigate('AllLocalLists', {
            lists: localLists,
            city: discoverCity!.name,
            initialCategory: launchCategory!.label,
          });
        }}
        onCreateList={() => {
          setLaunchCategory(null);
          if (!user) { navigation.navigate('AuthScreen'); return; }
          navigation.navigate('CreateList', { initialCategory: launchCategory!.label });
        }}
      />
    </View>
  );
};

/* ── Featured Card (carousel) ── */
const FeaturedCard: React.FC<{ list: FeaturedList; onPress: () => void }> = ({ list, onPress }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [items, setItems] = useState<string[]>(list.previewItems);

  useEffect(() => {
    if (list.staticImageUrl) {
      setImageUrl(list.staticImageUrl);
    } else {
      fetchFeaturedImage(list).then(setImageUrl);
    }
    fetchFeaturedItems(list).then((fetched) => {
      if (fetched.length > 0) setItems(fetched);
    });
  }, [list.id]);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cardHeader, { backgroundColor: list.color }]}>
        <LinearGradient
          colors={['#000000', list.color]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        <View style={[StyleSheet.absoluteFill, styles.cardHeaderScrim]} />
        <Text style={styles.cardCategory}>{list.category.toUpperCase()}</Text>
        <Ionicons name={list.icon as any} size={28} color="#FFF" />
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={2}>{list.title}</Text>
        {items.slice(0, 3).map((item, i) => (
          <Text key={i} style={styles.cardItem} numberOfLines={1}>
            {i + 1}. {item}
          </Text>
        ))}
      </View>
    </TouchableOpacity>
  );
};

/* ── Popular Row (thin card inside grouped container) ── */
const PopularRow: React.FC<{ list: PopularList; onPress: () => void }> = ({ list, onPress }) => (
  <TouchableOpacity style={styles.popularRow} onPress={onPress} activeOpacity={0.6}>
    <View style={[styles.popularDot, { backgroundColor: list.color }]} />
    <Text style={styles.popularTitle} numberOfLines={1}>{list.title}</Text>
    <Text style={styles.popularCategory}>{list.category}</Text>
    <Ionicons name="chevron-forward" size={14} color={colors.border} />
  </TouchableOpacity>
);

/* ── Niche Category Card (Start a List section) ── */
const NicheCategoryCard: React.FC<{ niche: NicheCategory; onIdeaPress: (idea: PopularList) => void }> = ({ niche, onIdeaPress }) => (
  <View style={styles.nicheCard}>
    <View style={styles.nicheHeader}>
      <LinearGradient
        colors={['#111111', niche.color]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />
      <Ionicons name={niche.icon as any} size={18} color="#FFF" />
      <Text style={styles.nicheHeaderLabel}>{niche.label}</Text>
    </View>
    {niche.ideas.map((idea, i, arr) => (
      <React.Fragment key={idea.id}>
        <TouchableOpacity style={styles.nicheIdeaRow} onPress={() => onIdeaPress(idea)} activeOpacity={0.6}>
          <Text style={styles.nicheIdeaText} numberOfLines={2}>{idea.title}</Text>
          <Ionicons name="add-circle-outline" size={15} color={niche.color} style={{ flexShrink: 0, opacity: 0.7 }} />
        </TouchableOpacity>
        {i < arr.length - 1 && <View style={styles.nicheDivider} />}
      </React.Fragment>
    ))}
  </View>
);

/* ── City Carousel Card (Explore Other Areas) ── */
const CityCarouselCard: React.FC<{ city: ExploreCity; onPress: () => void }> = ({ city, onPress }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchCityImage(city.id, city.wikiTitle).then(setImageUrl);
  }, [city.id]);

  return (
    <TouchableOpacity style={styles.cityCard} onPress={onPress} activeOpacity={0.85}>
      <View style={[styles.cityCardInner, { backgroundColor: '#2C2C2E' }]}>
        <LinearGradient
          colors={['#000000', '#2C2C2E']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        )}
        <View style={styles.cityCardOverlay} />
        <View style={styles.cityCardLabel}>
          <Text style={styles.cityCardName} numberOfLines={1}>{city.name}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

/* ── Featured Row (search results) ── */
const FeaturedRow: React.FC<{ list: FeaturedList; onPress: () => void }> = ({ list, onPress }) => (
  <TouchableOpacity style={styles.featuredRow} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.featuredThumb, { backgroundColor: list.color }]}>
      <Ionicons name={list.icon as any} size={26} color="#FFF" />
    </View>
    <View style={styles.featuredInfo}>
      <Text style={styles.featuredTitle} numberOfLines={1}>{list.title}</Text>
      <Text style={styles.featuredMeta}>{list.category} · {list.author}</Text>
    </View>
    <View style={styles.featuredBadge}>
      <Text style={styles.featuredBadgeText}>Featured</Text>
    </View>
    <Ionicons name="chevron-forward" size={14} color={colors.border} />
  </TouchableOpacity>
);

/* ── Community Row (search results) ── */
const CommunitySearchRow: React.FC<{ list: CommunityList; onPress: () => void }> = ({ list, onPress }) => (
  <TouchableOpacity style={styles.featuredRow} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.featuredThumb, { backgroundColor: list.color }]}>
      <Ionicons name={list.icon as any} size={26} color="#FFF" />
    </View>
    <View style={styles.featuredInfo}>
      <Text style={styles.featuredTitle} numberOfLines={1}>{list.title}</Text>
      <Text style={styles.featuredMeta}>{list.category} · {list.participantCount} votes</Text>
    </View>
    <View style={[styles.featuredBadge, styles.communityBadge]}>
      <Text style={[styles.featuredBadgeText, styles.communityBadgeText]}>Community</Text>
    </View>
    <Ionicons name="chevron-forward" size={14} color={colors.border} />
  </TouchableOpacity>
);

/* ── Category Launch Sheet ── */
const CategoryLaunchSheet: React.FC<{
  category: typeof CATEGORIES[0] | null;
  discoverCity: { name: string; slug: string } | null;
  onClose: () => void;
  onTopX: () => void;
  onInYourArea: () => void;
  onCreateList: () => void;
}> = ({ category, discoverCity, onClose, onTopX, onInYourArea, onCreateList }) => {
  const insets = useSafeAreaInsets();
  if (!category) return null;
  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[sheetStyles.sheet, { paddingBottom: insets.bottom + spacing.md }]}>
        {/* Handle */}
        <View style={sheetStyles.handle} />
        {/* Category header */}
        <View style={sheetStyles.categoryHeader}>
          <View style={[sheetStyles.categoryIconWrap, { backgroundColor: category.color + '22' }]}>
            <Ionicons name={category.icon as any} size={24} color={category.color} />
          </View>
          <Text style={sheetStyles.categoryTitle}>{category.label}</Text>
        </View>
        {/* Actions */}
        <View style={sheetStyles.actionsCard}>
          <TouchableOpacity style={sheetStyles.actionRow} onPress={onTopX} activeOpacity={0.7}>
            <View style={[sheetStyles.actionIcon, { backgroundColor: 'rgba(204,0,0,0.08)' }]}>
              <Ionicons name="globe-outline" size={20} color={colors.activeTab} />
            </View>
            <View style={sheetStyles.actionText}>
              <Text style={sheetStyles.actionLabel}>TopX People's Choice</Text>
              <Text style={sheetStyles.actionSub}>Browse & vote on community {category.label} lists</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </TouchableOpacity>

          <View style={sheetStyles.divider} />

          <TouchableOpacity
            style={[sheetStyles.actionRow, !discoverCity && sheetStyles.actionRowDisabled]}
            onPress={discoverCity ? onInYourArea : undefined}
            activeOpacity={discoverCity ? 0.7 : 1}
          >
            <View style={[sheetStyles.actionIcon, { backgroundColor: 'rgba(52,199,89,0.1)' }]}>
              <Ionicons name="location-outline" size={20} color={discoverCity ? '#34C759' : colors.border} />
            </View>
            <View style={sheetStyles.actionText}>
              <Text style={[sheetStyles.actionLabel, !discoverCity && sheetStyles.actionLabelDisabled]}>
                In Your Area
              </Text>
              <Text style={sheetStyles.actionSub}>
                {discoverCity ? `See ${category.label} lists in ${discoverCity.name}` : 'Location not detected'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </TouchableOpacity>

          <View style={sheetStyles.divider} />

          <TouchableOpacity style={sheetStyles.actionRow} onPress={onCreateList} activeOpacity={0.7}>
            <View style={[sheetStyles.actionIcon, { backgroundColor: category.color + '15' }]}>
              <Ionicons name="add-circle-outline" size={20} color={category.color} />
            </View>
            <View style={sheetStyles.actionText}>
              <Text style={sheetStyles.actionLabel}>Create a List</Text>
              <Text style={sheetStyles.actionSub}>Start your own {category.label} top ten</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.border} />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const sheetStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryText,
  },
  actionsCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
    marginBottom: spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    gap: spacing.md,
  },
  actionRowDisabled: {
    opacity: 0.45,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actionText: {
    flex: 1,
    gap: 2,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  actionLabelDisabled: {
    color: colors.secondaryText,
  },
  actionSub: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 36 + spacing.md,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  logoIcon: {
    width: 45,
    height: 45,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#CC0000',
    letterSpacing: -0.5,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    ...shadow,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.primaryText,
    paddingVertical: spacing.md,
  },
  browse: {
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryText,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    paddingRight: 0,
  },
  sectionHeaderInline: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.primaryText,
  },
  sectionHeaderLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  seeAllButton: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.activeTab,
  },
  seeAllPadding: {
    paddingRight: spacing.lg,
  },
  carousel: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  /* Featured Card */
  card: {
    width: 180,
    borderRadius: borderRadius.squircle,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow,
  },
  cardHeader: {
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    overflow: 'hidden',
  },
  cardHeaderScrim: {
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  cardCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
  },
  cardBody: {
    padding: spacing.md,
    gap: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 2,
  },
  cardAuthor: {
    fontSize: 11,
    color: '#CC0000',
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  cardItem: {
    fontSize: 11,
    color: colors.secondaryText,
  },
  /* Popular */
  popularCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.06,
  },
  popularRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    gap: spacing.md,
  },
  popularDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },
  popularTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.primaryText,
  },
  popularCategory: {
    fontSize: 12,
    color: colors.secondaryText,
    flexShrink: 0,
  },
  popularDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md + 10 + spacing.md,
  },
  /* Browse by Category grid */
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  categoryGridItem: {
    width: '22%',
    alignItems: 'center',
    gap: 5,
  },
  categoryGridIcon: {
    width: 52,
    height: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryGridLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.secondaryText,
    textAlign: 'center',
  },
  /* Niche Category Card */
  nicheCard: {
    width: 168,
    borderRadius: borderRadius.squircle,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.1,
  },
  nicheHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    overflow: 'hidden',
  },
  nicheHeaderLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.2,
  },
  nicheIdeaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
    gap: 8,
  },
  nicheDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    flexShrink: 0,
    opacity: 0.75,
  },
  nicheIdeaText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '500',
    color: colors.primaryText,
    lineHeight: 16,
  },
  nicheDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  /* City Carousel Card */
  cityCard: {
    width: 140,
    height: 90,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
    ...shadow,
    shadowOpacity: 0.12,
  },
  cityCardInner: {
    flex: 1,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
  },
  cityCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  cityCardLabel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.52)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  cityCardName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  /* Search results */
  searchResults: {
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  scopeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  scopePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  scopePillActive: {
    backgroundColor: '#CC0000',
    borderColor: '#CC0000',
  },
  scopePillText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  scopePillTextActive: {
    color: '#FFFFFF',
  },
  searchSectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  peopleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.cardBackground,
  },
  peopleRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  peopleAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  peopleAvatarFallback: {
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peopleDisplayName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  peopleUsername: {
    fontSize: 13,
    color: colors.secondaryText,
    marginTop: 1,
  },
  peopleDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.lg + 42 + spacing.md,
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    gap: spacing.md,
    ...shadow,
  },
  featuredThumb: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredInfo: {
    flex: 1,
  },
  featuredTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  featuredMeta: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  featuredBadge: {
    backgroundColor: 'rgba(204,0,0,0.1)',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  featuredBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.activeTab,
    letterSpacing: 0.3,
  },
  communityBadge: {
    backgroundColor: 'rgba(108,92,231,0.1)',
  },
  communityBadgeText: {
    color: '#6C5CE7',
  },
  empty: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    gap: spacing.md,
  },
  emptyText: {
    fontSize: 15,
    color: colors.secondaryText,
    textAlign: 'center',
    marginHorizontal: spacing.lg,
  },
});
