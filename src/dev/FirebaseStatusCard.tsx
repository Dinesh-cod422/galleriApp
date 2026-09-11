import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  type ConnectionReport,
  checkFirestoreConnection,
} from '@infra/firebase/connectionCheck';
import { Badge, Button, Card, Icon, Skeleton, Text, type Theme, useThemedStyles } from '@ds';

const styleFactory = (theme: Theme) => ({
  body: { padding: theme.spacing.base, gap: theme.spacing.sm },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
    flexWrap: 'wrap' as const,
  },
  stat: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
});

/**
 * Dev-only proof that the native Firebase wiring works: a real read against
 * the real project, rendered in the app rather than asserted in a doc.
 */
export const FirebaseStatusCard = (): React.JSX.Element => {
  const styles = useThemedStyles(styleFactory);
  const [report, setReport] = useState<ConnectionReport | null>(null);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    setLoading(true);
    setReport(await checkFirestoreConnection());
    setLoading(false);
  }, []);

  useEffect(() => {
    check().catch(() => {
      // checkFirestoreConnection never rejects; this satisfies the linter
      // without swallowing a real error path.
    });
  }, [check]);

  return (
    <Card elevation="md">
      <View style={styles.body}>
        <View style={styles.row}>
          <Icon
            name={report?.ok === true ? 'check' : report === null ? 'sparkles' : 'alert'}
            color={report?.ok === true ? 'accent' : 'secondary'}
          />
          <Text variant="h3">Firestore</Text>
          {report !== null && (
            <Badge
              label={report.ok ? 'connected' : 'failed'}
              tone={report.ok ? 'success' : 'danger'}
            />
          )}
          {report?.fromCache === true && <Badge label="from cache" />}
        </View>

        {loading && (
          <>
            <Skeleton height={16} width="60%" />
            <Skeleton height={16} width="40%" />
          </>
        )}

        {!loading && report?.ok === true && (
          <>
            <View style={styles.stat}>
              <Text variant="body" color="secondary">prompts</Text>
              <Text variant="bodyStrong">{String(report.promptCount)}</Text>
            </View>
            <View style={styles.stat}>
              <Text variant="body" color="secondary">categories</Text>
              <Text variant="bodyStrong">{String(report.categoryCount)}</Text>
            </View>
            {report.sampleTitle !== null && (
              <Text variant="caption" color="tertiary" numberOfLines={2}>
                {`sample: ${report.sampleTitle}`}
              </Text>
            )}
          </>
        )}

        {!loading && report?.ok === false && (
          <Text variant="caption" color="danger">
            {report.error ?? 'Unknown error'}
          </Text>
        )}

        <Button label="Re-check" variant="secondary" size="sm" onPress={check} />
      </View>
    </Card>
  );
};
