import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { AbstractEntity } from '../../../shared/entities/abstract.entity';
import { ExamType, QuestionType } from '../../../shared/enums';
import { Course } from '../../courses/entities/course.entity';
import { Group } from '../../groups/entities/group.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';

@Entity('exams')
export class Exam extends AbstractEntity {
  @Column({ name: 'tenant_id' })
  tenantId: string;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ExamType, default: ExamType.QUIZ })
  type: ExamType;

  @Column({ name: 'course_id', nullable: true })
  courseId: string;

  @ManyToOne(() => Course, { nullable: true })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ name: 'group_id', nullable: true })
  groupId: string;

  @ManyToOne(() => Group, { nullable: true })
  @JoinColumn({ name: 'group_id' })
  group: Group;

  @Column({ name: 'teacher_id' })
  teacherId: string;

  @ManyToOne(() => Teacher)
  @JoinColumn({ name: 'teacher_id' })
  teacher: Teacher;

  @Column({ name: 'start_at', type: 'timestamp', nullable: true })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamp', nullable: true })
  endAt: Date;

  @Column({ name: 'duration_minutes', default: 60 })
  durationMinutes: number;

  @Column({ name: 'total_marks', type: 'decimal', precision: 7, scale: 2, default: 100 })
  totalMarks: number;

  @Column({ name: 'passing_marks', type: 'decimal', precision: 7, scale: 2, default: 60 })
  passingMarks: number;

  @Column({ name: 'is_randomized', default: false })
  isRandomized: boolean;

  @Column({ name: 'show_result_immediately', default: true })
  showResultImmediately: boolean;

  @Column({ name: 'max_attempts', default: 1 })
  maxAttempts: number;

  @Column({ name: 'is_published', default: false })
  isPublished: boolean;

  @Column({ name: 'instructions', type: 'text', nullable: true })
  instructions: string;

  @OneToMany(() => ExamQuestion, (q) => q.exam)
  questions: ExamQuestion[];

  @OneToMany(() => ExamAttempt, (a) => a.exam)
  attempts: ExamAttempt[];
}

@Entity('exam_questions')
export class ExamQuestion extends AbstractEntity {
  @Column({ name: 'exam_id' })
  examId: string;

  @ManyToOne(() => Exam, (e) => e.questions)
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'enum', enum: QuestionType, default: QuestionType.MULTIPLE_CHOICE })
  type: QuestionType;

  @Column({ type: 'jsonb', name: 'options', default: [] })
  options: Array<{ id: string; text: string; isCorrect: boolean }>;

  @Column({ name: 'correct_answer', type: 'text', nullable: true })
  correctAnswer: string;

  @Column({ name: 'marks', type: 'decimal', precision: 5, scale: 2, default: 1 })
  marks: number;

  @Column({ name: 'explanation', type: 'text', nullable: true })
  explanation: string;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}

@Entity('exam_attempts')
export class ExamAttempt extends AbstractEntity {
  @Column({ name: 'exam_id' })
  examId: string;

  @ManyToOne(() => Exam, (e) => e.attempts)
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ name: 'started_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  startedAt: Date;

  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ name: 'score', type: 'decimal', precision: 7, scale: 2, nullable: true })
  score: number;

  @Column({ name: 'is_passed', nullable: true })
  isPassed: boolean;

  @Column({ name: 'attempt_number', default: 1 })
  attemptNumber: number;

  @Column({ name: 'time_taken_minutes', nullable: true })
  timeTakenMinutes: number;

  @Column({ type: 'jsonb', name: 'answers', default: [] })
  answers: Array<{ questionId: string; answer: string; isCorrect?: boolean; marks?: number }>;
}
