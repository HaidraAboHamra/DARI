import { EMPLOYMENT_TYPES, type EmploymentType, type Job } from '@dari/contracts';
import { EMPLOYMENT_LABEL } from '@dari/contracts/i18n';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';
import { JobCard } from '@/components/cards';
import { PagedItems } from '@/components/paged';
import { Chip, Screen } from '@/components/ui';
import { config } from '@/lib/config';
import { usePaged } from '@/lib/query';

export default function Jobs() {
  const [type, setType] = useState<EmploymentType | undefined>();
  const list = usePaged<Job>('/jobs', { city: config.city, employmentType: type });
  return (
    <Screen refreshing={list.isRefetching} onRefresh={() => void list.refetch()}>
      <Stack.Screen options={{ title: 'وظائف' }} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="الكل" active={!type} onPress={() => setType(undefined)} />
        {EMPLOYMENT_TYPES.map((t) => <Chip key={t} label={EMPLOYMENT_LABEL[t]} active={type === t} onPress={() => setType(t)} />)}
      </ScrollView>
      <PagedItems list={list} empty="لا وظائف حالياً" render={(j) => <JobCard key={j.id} job={j} />} />
    </Screen>
  );
}
