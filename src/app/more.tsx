import { StyleSheet, View } from 'react-native';
import { EmptyState } from '@/components/EmptyState';

export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <EmptyState
        icon="sparkles-outline"
        title="Próximamente"
        subtitle="Aquí irán apareciendo nuevas funciones."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
