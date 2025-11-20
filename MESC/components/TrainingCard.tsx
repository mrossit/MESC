import React from 'react';
import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Image } from '@/components/ui/image';
import { Pressable } from '@/components/ui/pressable';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Progress, ProgressFilledTrack } from '@/components/ui/progress';
import { Training } from '@/data/mock-trainings';
import Link from 'next/link';

interface TrainingCardProps {
    training: Training;
}

export const TrainingCard = ({ training }: TrainingCardProps) => {
    return (
        <Link href={`/treinamentos/${training.id}`} legacyBehavior>
            <Pressable>
                <Box
                    className="bg-background-0 rounded-lg overflow-hidden border border-outline-100 my-2"
                >
                    <Box className="h-32 w-full relative">
                        <Image
                            source={{ uri: training.imageUrl }}
                            alt={training.title}
                            className="w-full h-full object-cover"
                        />
                    </Box>
                    <VStack className="p-4 space-y-2">
                        <Text className="text-typography-900 font-bold text-lg">
                            {training.title}
                        </Text>
                        <Text className="text-typography-500 text-sm line-clamp-2">
                            {training.description}
                        </Text>

                        {training.progress > 0 && (
                            <VStack className="space-y-1 mt-2">
                                <HStack className="justify-between">
                                    <Text className="text-xs text-typography-400">Progresso</Text>
                                    <Text className="text-xs text-typography-400">{training.progress}%</Text>
                                </HStack>
                                <Progress value={training.progress} className="h-2 w-full bg-background-100">
                                    <ProgressFilledTrack className="bg-primary-500" />
                                </Progress>
                            </VStack>
                        )}
                    </VStack>
                </Box>
            </Pressable>
        </Link>
    );
};
