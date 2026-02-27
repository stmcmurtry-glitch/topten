import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PlansModal } from '../components/PlansModal';
import { colors, spacing, borderRadius } from '../theme';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface FAQItem {
  question: string;
  answer: string;
  actionLabel?: string;
  onAction?: () => void;
}

const FAQ_SECTIONS: { title: string; items: FAQItem[] }[] = [
  {
    title: 'Community & Rankings',
    items: [
      {
        question: 'How do community rankings work?',
        answer:
          'Community rankings are calculated by aggregating votes from all users who have ranked that list. Each item\'s position in your ranking contributes points — first place earns the most, tenth place earns fewer. The combined scores from all voters determine the community\'s official order.',
      },
      {
        question: 'When do community scores update?',
        answer:
          'Community scores are updated overnight in a nightly batch process. When you submit or update your ranking, your vote is recorded immediately — but the visible standings reflect the previous night\'s calculation. Check back the next day to see updated results.',
      },
      {
        question: 'Can I change or update my vote?',
        answer:
          'Yes. You can update your community list rankings at any time. Just reopen the community list, adjust your picks, and submit again. Your most recent submission always replaces the previous one.',
      },
      {
        question: 'Is my vote anonymous?',
        answer:
          'Yes. Community rankings show aggregated scores only — no one can see how you personally voted on any individual item.',
      },
    ],
  },
  {
    title: 'Location',
    items: [
      {
        question: 'How does location detection work?',
        answer:
          'Top Ten uses your device\'s IP address to estimate your city. This powers the "In Your Area" lists — things like the best restaurants or bars near you. We never access GPS or request precise location permissions.',
      },
      {
        question: 'Is my location stored or shared?',
        answer:
          'Your detected location is cached locally on your device for 7 days. It is never sent to our servers or shared with third parties. You can reset it at any time from Account → Location.',
      },
    ],
  },
  {
    title: 'Data & Privacy',
    items: [
      {
        question: 'How is my personal data used?',
        answer:
          'We collect minimal data: your lists are stored locally on your device, and we use anonymous analytics to improve the app. We do not sell your data or share it with advertisers. See our Privacy Policy for full details.',
      },
      {
        question: 'Can I delete my data?',
        answer:
          'Yes. You can delete all your local list data from Account → Your Data. To request deletion of any server-side analytics data, contact us directly through Account → Contact Us.',
      },
    ],
  },
  {
    title: 'Account & Plans',
    items: [
      {
        question: "What's the difference between Free and Premium?",
        answer:
          'Free accounts include full access to all 16 categories, community rankings and voting, Discover featured lists, In Your Area local lists, and the ability to create up to 100 lists with custom cover photos on up to 10 of them.\n\nPremium ($2.49/mo or $9.99/yr) unlocks:\n  · Unlimited lists — no cap, ever\n  · Unlimited custom cover photos on every list\n  · No ads\n\nYour existing lists and customizations are always yours — Premium just removes the limits.',
        actionLabel: 'View Premium Plans',
      },
      {
        question: 'How do I report an issue with a list?',
        answer:
          'Tap the flag icon on any list to report a factual error, outdated information, or other problem. Reports go directly to our team and we review them regularly. For general app feedback, use the rating card at the bottom of the Account page.',
      },
    ],
  },
];

const FAQRow: React.FC<{ item: FAQItem; isLast: boolean }> = ({ item, isLast }) => {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((v) => !v);
  };

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <TouchableOpacity
        style={styles.questionRow}
        onPress={toggle}
        activeOpacity={0.7}
      >
        <Text style={styles.question}>{item.question}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={colors.secondaryText}
        />
      </TouchableOpacity>
      {open && (
        <>
          <Text style={styles.answer}>{item.answer}</Text>
          {item.actionLabel && item.onAction && (
            <TouchableOpacity style={styles.actionButton} onPress={item.onAction} activeOpacity={0.8}>
              <Text style={styles.actionButtonText}>{item.actionLabel}</Text>
              <Ionicons name="arrow-forward" size={14} color="#FFF" />
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
};

export const FAQScreen: React.FC = () => {
  const [showPlans, setShowPlans] = useState(false);

  const sections = FAQ_SECTIONS.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.actionLabel
        ? { ...item, onAction: () => setShowPlans(true) }
        : item
    ),
  }));

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>
            <View style={styles.card}>
              {section.items.map((item, i) => (
                <FAQRow
                  key={item.question}
                  item={item}
                  isLast={i === section.items.length - 1}
                />
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      <PlansModal visible={showPlans} onClose={() => setShowPlans(false)} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingBottom: spacing.xxl * 2,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    letterSpacing: 0.4,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    marginHorizontal: spacing.lg,
  },
  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.cardBackground,
    borderRadius: borderRadius.squircle,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  questionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  question: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: colors.primaryText,
    lineHeight: 20,
  },
  answer: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.secondaryText,
    lineHeight: 21,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    backgroundColor: '#000000',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFF',
  },
});
